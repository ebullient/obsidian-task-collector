import type { Extension } from "@codemirror/state";
import { type EditorView, ViewPlugin } from "@codemirror/view";
import {
    type Command,
    type Editor,
    type EditorPosition,
    type EventRef,
    type MarkdownFileInfo,
    type MarkdownPostProcessor,
    MarkdownPreviewRenderer,
    MarkdownView,
    Menu,
    Plugin,
    type TFile,
} from "obsidian";
import type { API } from "./@types/api";
import type { LegacySettings } from "./@types/settings";
import { TaskCollectorApi } from "./taskcollector-Api";
import { TEXT_ONLY_MARK } from "./taskcollector-Constants";
import { Data } from "./taskcollector-Data";
import { TaskCollectorSettingsTab } from "./taskcollector-SettingsTab";
import { Direction, TaskCollector } from "./taskcollector-TaskCollector";
import { promptForMark } from "./taskcollector-TaskMarkModal";

declare module "obsidian" {
    interface App {
        commands: {
            commands: {
                [id: string]: Command;
            };
            removeCommand(id: string): void;
            executeCommandById: (id: string) => void;
        };
        plugins: {
            plugins: {
                "obsidian-task-collector": {
                    api: API;
                };
            };
        };
    }

    interface MarkdownPostProcessorContext {
        containerEl: HTMLElement;
    }
}

interface Selection {
    start: EditorPosition;
    end?: EditorPosition;
    lines: number[];
}

/**
 * Minimal shape of Obsidian's internal Canvas node/view objects that this plugin
 * reads from. Entirely undocumented (not part of the public `obsidian` package) -
 * these fields were confirmed live against a running Obsidian instance, not from
 * any published type definition, and may change without notice across versions.
 */
interface CanvasNode {
    nodeEl?: HTMLElement;
    subpath?: string;
}

interface Canvas {
    nodes?: Map<string, CanvasNode>;
}

interface CanvasView {
    canvas?: Canvas;
}

export class TaskCollectorPlugin extends Plugin {
    tc: TaskCollector;
    handlersRegistered = false;
    commandsRegistered = false;

    editTaskContextMenu?: EventRef;
    postProcessor?: MarkdownPostProcessor;

    /** CodeMirror 6 extensions. Tracked via array to allow for dynamic updates. */
    private cmExtension: Extension[] = [];

    /** External-facing plugin API. */
    public api: API;

    async onload(): Promise<void> {
        console.debug(`loading Task Collector (TC) v${this.manifest.version}`);

        this.tc = new TaskCollector();
        await this.loadSettings();
        this.addSettingTab(
            new TaskCollectorSettingsTab(this.app, this, this.tc),
        );

        // Live Preview: register input handler
        if (this.tc.settings.previewClickModal) {
            this.cmExtension.push(inlinePlugin(this, this.tc));
            this.registerEditorExtension(this.cmExtension);
        }

        this.registerCommands();
        this.registerHandlers();

        this.api = new TaskCollectorApi(this.app, this.tc);
        this.app.plugins.plugins["obsidian-task-collector"].api = this.api;
    }

    async markInCycle(direction: Direction, lines?: number[]): Promise<void> {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
            await this.app.vault.process(activeFile, (source): string => {
                return this.tc.markInCycle(source, direction, lines);
            });
        }
    }

    async editLines(mark: string, lines?: number[]): Promise<void> {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
            await this.editLinesInFile(activeFile, mark, lines);
        }
    }

    async editLinesInFile(
        file: TFile,
        mark: string,
        lines?: number[],
    ): Promise<void> {
        await this.app.vault.process(file, (source): string => {
            return this.tc.markSelectedTask(source, mark, lines);
        });
    }

    async collectTasks(): Promise<void> {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
            await this.app.vault.process(activeFile, (source): string => {
                return this.tc.moveAllTasks(source);
            });
        }
    }

    async resetAllTasks(): Promise<void> {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
            await this.app.vault.process(activeFile, (source): string => {
                return this.tc.resetAllTasks(source);
            });
        }
    }

    getCurrentLinesFromEditor(editor: Editor): Selection {
        this.tc.logDebug(
            "from: %o, to: %o, anchor: %o, head: %o, general: %o",
            editor.getCursor("from"),
            editor.getCursor("to"),
            editor.getCursor("anchor"),
            editor.getCursor("head"),
            editor.getCursor(),
        );

        if (editor.somethingSelected()) {
            const start = editor.getCursor("from");
            const end = editor.getCursor("to");
            const lines: number[] = [];
            for (let i = start.line; i <= end.line; i++) {
                lines.push(i);
            }
            return {
                start,
                end,
                lines,
            };
        }

        const start = editor.getCursor();
        return {
            start,
            lines: [start.line],
        };
    }

    /**
     * Maps a rendered .canvas-node element to its live Canvas node object via
     * nodeEl reference equality - there's no id in the rendered DOM to key on.
     */
    private findCanvasNode(canvasNodeEl: HTMLElement): CanvasNode | undefined {
        const canvasLeaves = this.app.workspace.getLeavesOfType("canvas");
        for (const leaf of canvasLeaves) {
            const canvas = (leaf.view as unknown as CanvasView).canvas;
            const nodes = canvas?.nodes;
            if (!nodes) continue;
            for (const node of nodes.values()) {
                if (node.nodeEl === canvasNodeEl) {
                    return node;
                }
            }
        }
        return undefined;
    }

    /**
     * File-relative starting line of a Canvas card's subpath scope (heading or
     * block ref), or 0 for a whole-file card. Must be called at event time, not
     * from a markdown post-processor - canvasNodeEl's DOM may not be ready yet,
     * and the node may not be tracked by the live Canvas view until interacted with.
     */
    resolveCanvasSubpathOffset(
        canvasNodeEl: HTMLElement,
        targetFile: TFile,
    ): number {
        return this.resolveCanvasSubpathOffsetDetailed(canvasNodeEl, targetFile)
            .offset;
    }

    private resolveCanvasSubpathOffsetDetailed(
        canvasNodeEl: HTMLElement,
        targetFile: TFile,
    ): { offset: number; isHeadingScoped: boolean } {
        const node = this.findCanvasNode(canvasNodeEl);
        const subpath = node?.subpath;
        if (!subpath) {
            return { offset: 0, isHeadingScoped: false };
        }

        const metadata = this.app.metadataCache.getFileCache(targetFile);
        const blockRef = subpath.split("#^")[1];
        const header = subpath.split("#")[1];
        let offset = 0;
        let isHeadingScoped = false;
        if (blockRef) {
            const block = metadata?.blocks?.[blockRef];
            offset = block?.position.start.line ?? 0;
        } else if (header) {
            const heading = metadata?.headings?.find(
                (h) => h.heading === header,
            );
            offset = heading?.position.start.line ?? 0;
            isHeadingScoped = !!heading;
        }
        this.tc.logDebug("resolveCanvasSubpathOffset", subpath, offset);
        return { offset, isHeadingScoped };
    }

    /**
     * Canvas subpath offset for the currently-focused editor (0 if not in Canvas).
     * +1 for heading-scoped cards: their CM6 editor excludes the heading line
     * itself, so editor line numbers start one line later than the raw offset.
     */
    resolveActiveCanvasOffset(targetFile: TFile): number {
        const canvasNodeEl = (
            document.activeElement as HTMLElement | null
        )?.closest(".canvas-node") as HTMLElement | null;
        if (!canvasNodeEl) {
            return 0;
        }
        const { offset, isHeadingScoped } =
            this.resolveCanvasSubpathOffsetDetailed(canvasNodeEl, targetFile);
        return isHeadingScoped ? offset + 1 : offset;
    }

    buildContextMenu(
        menu: Menu,
        info: MarkdownFileInfo,
        selection: Selection,
    ): void {
        if (this.tc.settings.contextMenu.markTask) {
            menu.addItem((item) =>
                item
                    .setTitle("(TC) mark task")
                    .setIcon("check-square")
                    .onClick(async () => {
                        this.tc.logDebug("Mark task", menu, info, selection);
                        const mark = await promptForMark(this.app, this.tc);
                        if (mark) {
                            await this.editLines(mark, selection.lines);
                            this.restoreCursor(selection, info.editor);
                        }
                    }),
            );
            if (this.tc.settings.markCycle) {
                menu.addItem((item) =>
                    item
                        .setTitle("(TC) mark with next")
                        .setIcon("forward")
                        .onClick(async () => {
                            this.tc.logDebug(
                                "Mark with next",
                                menu,
                                info,
                                selection,
                            );
                            await this.markInCycle(
                                Direction.NEXT,
                                selection.lines,
                            );
                            this.restoreCursor(selection, info.editor);
                        }),
                );

                menu.addItem((item) =>
                    item
                        .setTitle("(TC) mark with previous")
                        .setIcon("reply")
                        .onClick(async () => {
                            this.tc.logDebug(
                                "Mark with previous",
                                menu,
                                info,
                                selection,
                            );
                            await this.markInCycle(
                                Direction.PREV,
                                selection.lines,
                            );
                            this.restoreCursor(selection, info.editor);
                        }),
                );
            }
        }
        // dynamic/optional menu items
        for (const [k, ms] of Object.entries(this.tc.cache.marks)) {
            if (ms.useContextMenu) {
                menu.addItem((item) =>
                    item
                        .setTitle(
                            k === TEXT_ONLY_MARK
                                ? "(TC) Append text"
                                : `(TC) Change to '[${k}]' (${ms.name})`,
                        )
                        .setIcon("check-circle")
                        .onClick(async () => {
                            this.tc.logDebug(
                                `Change to '${k}'`,
                                menu,
                                info,
                                selection,
                            );
                            await this.editLines(k, selection.lines);
                            this.restoreCursor(selection, info.editor);
                        }),
                );
            }
        }

        if (this.tc.settings.contextMenu.resetAllTasks) {
            menu.addItem((item) =>
                item
                    .setTitle("(TC) reset all tasks")
                    .setIcon("blocks")
                    .onClick(async () => {
                        this.tc.logDebug("Reset all tasks", menu, info);
                        await this.resetAllTasks();
                        this.restoreCursor(selection, info.editor);
                    }),
            );
        }

        if (
            this.tc.settings.collectionEnabled &&
            this.tc.settings.contextMenu.collectTasks
        ) {
            menu.addItem((item) =>
                item
                    .setTitle("(TC) collect tasks")
                    .setIcon("tornado")
                    .onClick(async () => {
                        await this.collectTasks();
                        this.restoreCursor(selection, info.editor);
                    }),
            );
        }
    }

    restoreCursor(selection: Selection, editor: Editor) {
        if (selection.lines.length > 1) {
            editor.setSelection(selection.start, selection.end);
        } else {
            editor.setCursor(selection.start);
        }
    }

    /**
     * Like restoreCursor, but also re-applies after a delay when isInCanvas is
     * true: Canvas rebuilds the card's editor after a write, resetting its cursor.
     */
    private restoreCursorWithCanvasRetry(
        selection: Selection,
        editor: Editor,
        isInCanvas: boolean,
    ) {
        this.restoreCursor(selection, editor);
        if (isInCanvas) {
            setTimeout(() => this.restoreCursor(selection, editor), 250);
        }
    }

    private isCursorInCanvas(): boolean {
        return !!(document.activeElement as HTMLElement | null)?.closest(
            ".canvas-node",
        );
    }

    registerCommands(): void {
        if (!this.commandsRegistered) {
            this.tc.logDebug("register commands");
            this.commandsRegistered = true;

            const markTaskCommand: Command = {
                id: "task-collector-mark",
                name: "Mark task",
                icon: "check-square",
                editorCallback: async (
                    editor: Editor,
                    _view: MarkdownFileInfo,
                ) => {
                    // Resolve before the modal opens - it steals focus, so
                    // document.activeElement is wrong once it's open.
                    const selection = this.getCurrentLinesFromEditor(editor);
                    const isInCanvas = this.isCursorInCanvas();
                    const activeFile = this.app.workspace.getActiveFile();
                    const canvasOffset = activeFile
                        ? this.resolveActiveCanvasOffset(activeFile)
                        : 0;
                    const mark = await promptForMark(this.app, this.tc);
                    if (mark) {
                        const lines = canvasOffset
                            ? selection.lines.map((n) => n + canvasOffset)
                            : selection.lines;
                        if (canvasOffset) {
                            this.tc.logDebug(
                                "editor command: canvas offset",
                                lines,
                            );
                        }
                        await this.editLines(mark, lines);
                        this.restoreCursorWithCanvasRetry(
                            selection,
                            editor,
                            isInCanvas,
                        );
                    }
                },
            };
            this.addCommand(markTaskCommand);

            const resetAllTaskCommand: Command = {
                id: "task-collector-reset-all-tasks",
                name: "Reset all tasks",
                icon: "blocks",
                callback: async () => {
                    await this.resetAllTasks();
                },
            };
            this.addCommand(resetAllTaskCommand);

            if (this.tc.settings.collectionEnabled) {
                const moveAllTaskCommand: Command = {
                    id: "task-collector-move-completed-tasks",
                    name: "Collect tasks",
                    icon: "tornado",
                    callback: async () => {
                        // Collecting rewrites the whole file out of band.
                        // Collapse selection first to avoid stray selection.
                        const editor = this.app.workspace.activeEditor?.editor;
                        if (editor?.somethingSelected()) {
                            editor.setCursor(editor.getCursor("from"));
                        }
                        await this.collectTasks();
                    },
                };
                this.addCommand(moveAllTaskCommand);
            }

            if (this.tc.settings.markCycle) {
                const markWithNextCommand: Command = {
                    id: "task-collector-mark-next",
                    name: "Mark with next",
                    icon: "forward",
                    editorCallback: async (
                        editor: Editor,
                        view: MarkdownFileInfo,
                    ) => {
                        this.tc.logDebug(
                            `${markWithNextCommand.id}: callback`,
                            editor,
                            view,
                        );
                        const selection =
                            this.getCurrentLinesFromEditor(editor);
                        const isInCanvas = this.isCursorInCanvas();
                        const activeFile = this.app.workspace.getActiveFile();
                        const canvasOffset = activeFile
                            ? this.resolveActiveCanvasOffset(activeFile)
                            : 0;
                        const lines = canvasOffset
                            ? selection.lines.map((n) => n + canvasOffset)
                            : selection.lines;
                        if (canvasOffset) {
                            this.tc.logDebug(
                                "editor command: canvas offset",
                                lines,
                            );
                        }
                        await this.markInCycle(Direction.NEXT, lines);
                        this.restoreCursorWithCanvasRetry(
                            selection,
                            editor,
                            isInCanvas,
                        );
                    },
                };
                this.addCommand(markWithNextCommand);

                const markWithPrevCommand: Command = {
                    id: "task-collector-mark-prev",
                    name: "Mark with previous",
                    icon: "reply",
                    editorCallback: async (
                        editor: Editor,
                        view: MarkdownFileInfo,
                    ) => {
                        this.tc.logDebug(
                            `${markWithPrevCommand.id}: callback`,
                            editor,
                            view,
                        );
                        const selection =
                            this.getCurrentLinesFromEditor(editor);
                        const isInCanvas = this.isCursorInCanvas();
                        const activeFile = this.app.workspace.getActiveFile();
                        const canvasOffset = activeFile
                            ? this.resolveActiveCanvasOffset(activeFile)
                            : 0;
                        const lines = canvasOffset
                            ? selection.lines.map((n) => n + canvasOffset)
                            : selection.lines;
                        if (canvasOffset) {
                            this.tc.logDebug(
                                "editor command: canvas offset",
                                lines,
                            );
                        }
                        await this.markInCycle(Direction.PREV, lines);
                        this.restoreCursorWithCanvasRetry(
                            selection,
                            editor,
                            isInCanvas,
                        );
                    },
                };
                this.addCommand(markWithPrevCommand);
            }

            // Per-group/mark commands
            for (const [k, ms] of Object.entries(this.tc.cache.marks)) {
                if (ms.registerCommand) {
                    const command: Command = {
                        id: `task-collector-mark-task-${k}`,
                        name:
                            k === TEXT_ONLY_MARK
                                ? "Append text"
                                : `Mark with '${k}'`,
                        icon:
                            k === TEXT_ONLY_MARK ? "list-plus" : "check-circle",
                        editorCallback: async (
                            editor: Editor,
                            view: MarkdownFileInfo,
                        ) => {
                            const selection =
                                this.getCurrentLinesFromEditor(editor);
                            const isInCanvas = this.isCursorInCanvas();
                            this.tc.logDebug(
                                `${command.id}: callback`,
                                selection,
                                editor,
                                view,
                            );
                            const activeFile =
                                this.app.workspace.getActiveFile();
                            const canvasOffset = activeFile
                                ? this.resolveActiveCanvasOffset(activeFile)
                                : 0;
                            const lines = canvasOffset
                                ? selection.lines.map((n) => n + canvasOffset)
                                : selection.lines;
                            if (canvasOffset) {
                                this.tc.logDebug(
                                    "editor command: canvas offset",
                                    lines,
                                );
                            }
                            await this.editLines(k, lines);
                            this.restoreCursorWithCanvasRetry(
                                selection,
                                editor,
                                isInCanvas,
                            );
                        },
                    };
                    this.addCommand(command);
                }
            }
        }
    }

    unregisterCommands(): void {
        this.tc.logDebug("unregister commands");
        this.commandsRegistered = false;

        const oldCommands = Object.keys(this.app.commands.commands).filter(
            (p) => p.startsWith("task-collector-"),
        );
        for (const command of oldCommands) {
            this.app.commands.removeCommand(command);
        }
    }

    registerHandlers(): void {
        if (!this.handlersRegistered) {
            this.tc.logDebug("register handlers");
            this.handlersRegistered = true;

            // Source / Live Preview mode: register context menu
            if (this.tc.cache.useContextMenu) {
                this.editTaskContextMenu = this.app.workspace.on(
                    "editor-menu",
                    async (menu, editor, info) => {
                        //get line selections here
                        const selection =
                            this.getCurrentLinesFromEditor(editor);
                        const canvasOffset = info.file
                            ? this.resolveActiveCanvasOffset(info.file)
                            : 0;
                        if (canvasOffset) {
                            this.tc.logDebug(
                                "editor command: canvas offset",
                                selection.lines.map((n) => n + canvasOffset),
                            );
                        }
                        this.buildContextMenu(menu, info, {
                            ...selection,
                            lines: canvasOffset
                                ? selection.lines.map((n) => n + canvasOffset)
                                : selection.lines,
                        });
                    },
                );
                this.registerEvent(this.editTaskContextMenu);
            }

            // Reading mode: register post-processor
            if (
                this.tc.cache.useContextMenu ||
                this.tc.settings.previewClickModal
            ) {
                this.postProcessor = (el, ctx) => {
                    const checkboxes = el.querySelectorAll<HTMLInputElement>(
                        ".task-list-item-checkbox",
                    );
                    const section = ctx.getSectionInfo(el);

                    if (!checkboxes.length || !ctx.sourcePath || !section) {
                        return;
                    }
                    const targetFile = this.app.vault.getFileByPath(
                        ctx.sourcePath,
                    );

                    this.tc.logDebug(
                        "markdown postprocessor",
                        el,
                        ctx,
                        section,
                        checkboxes,
                        targetFile,
                    );

                    // Reset the parent element for embedded elements...
                    let parent: HTMLElement = ctx.containerEl;
                    while (
                        parent &&
                        !parent.classList.contains("markdown-reading-view")
                    ) {
                        if (parent.classList.contains("markdown-embed")) {
                            break;
                        }
                        parent = parent.parentNode as HTMLElement;
                    }

                    let { lineStart } = section;

                    if (parent.hasAttribute("src")) {
                        // If the parent is an embedded element, we need to adjust the line number
                        const src = parent.getAttribute("src");
                        const blockRef = src.split("#^")[1];
                        const header = src.split("#")[1];
                        const metadata =
                            this.app.metadataCache.getFileCache(targetFile);
                        if (blockRef) {
                            const block = metadata.blocks[blockRef];
                            if (block) {
                                lineStart += block.position.start.line;
                            }
                        } else if (header) {
                            const heading = metadata.headings.find(
                                (h) => h.heading === header,
                            );
                            if (heading) {
                                lineStart += heading.position.start.line;
                            }
                        }
                    }

                    // Resolved at event time, not here: the postprocessor runs
                    // on a detached fragment with no real Canvas-node ancestry yet,
                    // and checkbox.dataset.line can go stale if Obsidian reuses
                    // this same DOM node across a later re-render.
                    const resolveLineForEvent = (
                        startEl: HTMLElement,
                        checkboxEl: HTMLInputElement,
                    ): { line: number; canvasNode?: CanvasNode } => {
                        const base =
                            Number(lineStart) + Number(checkboxEl.dataset.line);
                        const canvasNodeEl = startEl.closest(
                            ".canvas-node",
                        ) as HTMLElement | null;
                        const canvasNode = canvasNodeEl
                            ? this.findCanvasNode(canvasNodeEl)
                            : undefined;
                        let canvasOffset = 0;
                        if (canvasNodeEl) {
                            const detailed =
                                this.resolveCanvasSubpathOffsetDetailed(
                                    canvasNodeEl,
                                    targetFile,
                                );
                            // The reading-mode section's own lineStart does not
                            // include the heading line, same as the CM6 editor
                            // used by editor commands - see resolveActiveCanvasOffset.
                            canvasOffset = detailed.isHeadingScoped
                                ? detailed.offset + 1
                                : detailed.offset;
                        }
                        if (canvasOffset) {
                            this.tc.logDebug(
                                "reading-mode: canvas offset",
                                canvasOffset,
                            );
                        }
                        return { line: base + canvasOffset, canvasNode };
                    };

                    for (const checkbox of Array.from(checkboxes)) {
                        const baseLine =
                            Number(lineStart) + Number(checkbox.dataset.line);

                        checkbox.setAttribute(
                            "data-tc-line",
                            baseLine.toString(),
                        );
                        const parent = checkbox.parentElement;

                        if (this.tc.cache.useContextMenu && parent) {
                            this.registerDomEvent(
                                parent,
                                "contextmenu",
                                (ev) => {
                                    const { line } = resolveLineForEvent(
                                        parent,
                                        checkbox,
                                    );
                                    const view =
                                        this.app.workspace.getActiveViewOfType(
                                            MarkdownView,
                                        );
                                    const info = {
                                        editor: view?.editor,
                                    } as MarkdownFileInfo;
                                    const menu = new Menu();
                                    this.buildContextMenu(menu, info, {
                                        start: {
                                            line,
                                            ch: 0,
                                        },
                                        lines: [line],
                                    });
                                    menu.showAtMouseEvent(ev);
                                },
                            );
                        }

                        if (this.tc.settings.previewClickModal) {
                            // reading mode
                            this.registerDomEvent(
                                checkbox,
                                "click",
                                async (ev) => {
                                    ev.stopImmediatePropagation();
                                    ev.preventDefault();
                                    const { line } = resolveLineForEvent(
                                        checkbox,
                                        checkbox,
                                    );
                                    const mark = await promptForMark(
                                        this.app,
                                        this.tc,
                                    );
                                    if (mark) {
                                        checkbox.checked = mark !== " ";
                                        checkbox.parentElement.dataset.task =
                                            mark;
                                        await this.editLinesInFile(
                                            targetFile,
                                            mark,
                                            [line],
                                        );
                                    }
                                },
                            );
                        }
                    }
                };
                this.registerMarkdownPostProcessor(this.postProcessor);
            }
        }
    }

    unregisterHandlers(): void {
        this.tc.logDebug("unregister handlers");
        this.handlersRegistered = false;

        if (this.editTaskContextMenu) {
            this.app.workspace.offref(this.editTaskContextMenu);
            this.editTaskContextMenu = null;
        }

        if (this.postProcessor) {
            MarkdownPreviewRenderer.unregisterPostProcessor(this.postProcessor);
            this.postProcessor = null;
        }
    }

    onunload(): void {
        this.unregisterCommands();
        this.unregisterHandlers();
    }

    async loadSettings(): Promise<void> {
        const obj = Object.assign(
            {},
            (await this.loadData()) as LegacySettings,
        );
        this.tc.init(await Data.constructSettings(this, obj));
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.tc.settings);

        if (this.handlersRegistered) {
            this.unregisterHandlers();
            this.registerHandlers();
        }
        if (this.commandsRegistered) {
            this.unregisterCommands();
            this.registerCommands();
        }
    }
}

export function inlinePlugin(tcp: TaskCollectorPlugin, tc: TaskCollector) {
    return ViewPlugin.fromClass(
        class {
            private readonly view: EditorView;
            private readonly eventHandler: (ev: MouseEvent) => void;
            private readonly tcp: TaskCollectorPlugin;

            constructor(view: EditorView) {
                this.view = view;
                this.tcp = tcp;

                this.eventHandler = (ev: MouseEvent) => {
                    void (async () => {
                        const { target } = ev;
                        const activeFile =
                            this.tcp.app.workspace.getActiveFile();
                        if (
                            !activeFile ||
                            !(target instanceof HTMLInputElement) ||
                            target.type !== "checkbox" ||
                            target.classList.contains("metadata-input-checkbox")
                        ) {
                            return;
                        }
                        tcp.tc.logDebug(
                            "TC ViewPlugin: click",
                            target,
                            target.classList,
                        );
                        ev.stopImmediatePropagation();
                        ev.preventDefault();

                        const mark = await promptForMark(this.tcp.app, tc);
                        if (!mark) {
                            return;
                        }
                        await this.tcp.app.vault.process(
                            activeFile,
                            (source): string => {
                                const position = this.view.posAtDOM(target);
                                const line = view.state.doc.lineAt(position);
                                const i = source.split("\n").indexOf(line.text);

                                tc.logDebug(
                                    "TC ViewPlugin: mark task",
                                    activeFile.path,
                                    mark,
                                    line,
                                    i,
                                );

                                if (tcp.tc.anyTaskMark.test(line.text)) {
                                    return tc.markSelectedTask(source, mark, [
                                        i,
                                    ]);
                                }
                                const offset = Number(target.dataset.line);
                                return tc.markSelectedTask(source, mark, [
                                    i + offset,
                                ]);
                            },
                        );
                    })();
                };

                this.view.dom.addEventListener("click", this.eventHandler);
                tcp.tc.logDebug("TC ViewPlugin: create click handler");
            }

            destroy() {
                this.view.dom.removeEventListener("click", this.eventHandler);
                tcp.tc.logDebug("TC ViewPlugin: destroy click handler");
            }
        },
    );
}
