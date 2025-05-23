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

export class TaskCollectorPlugin extends Plugin {
    tc: TaskCollector;
    handlersRegistered = false;
    commandsRegistered = false;

    editTaskContextMenu: EventRef;
    postProcessor: MarkdownPostProcessor;

    /** CodeMirror 6 extensions. Tracked via array to allow for dynamic updates. */
    private cmExtension: Extension[] = [];

    /** External-facing plugin API. */
    public api: API;

    async onload(): Promise<void> {
        console.info(`loading Task Collector (TC) v${this.manifest.version}`);

        this.tc = new TaskCollector();
        this.addSettingTab(
            new TaskCollectorSettingsTab(this.app, this, this.tc),
        );
        await this.loadSettings();

        // Live Preview: register input handler
        if (this.tc.settings.previewClickModal) {
            this.cmExtension.push(inlinePlugin(this, this.tc));
            this.registerEditorExtension(this.cmExtension);
        }

        this.registerCommands();
        this.registerHandlers();

        this.api = new TaskCollectorApi(this.app, this.tc);
    }

    async markInCycle(direction: Direction, lines?: number[]): Promise<void> {
        const activeFile = this.app.workspace.getActiveFile();
        await this.app.vault.process(activeFile, (source): string => {
            return this.tc.markInCycle(source, direction, lines);
        });
    }

    async editLines(mark: string, lines?: number[]): Promise<void> {
        const activeFile = this.app.workspace.getActiveFile();
        await this.editLinesInFile(activeFile, mark, lines);
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
        await this.app.vault.process(activeFile, (source): string => {
            return this.tc.moveAllTasks(source);
        });
    }

    async resetAllTasks(): Promise<void> {
        const activeFile = this.app.workspace.getActiveFile();
        await this.app.vault.process(activeFile, (source): string => {
            return this.tc.resetAllTasks(source);
        });
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

        let start: EditorPosition;
        let end: EditorPosition;
        const lines: number[] = [];
        if (editor.somethingSelected()) {
            start = editor.getCursor("from");
            end = editor.getCursor("to");
            for (let i = start.line; i <= end.line; i++) {
                lines.push(i);
            }
        } else {
            start = editor.getCursor();
            lines.push(start.line);
        }
        return {
            start,
            end,
            lines,
        };
    }

    buildContextMenu(
        menu: Menu,
        info: MarkdownView | MarkdownFileInfo,
        selection: Selection,
    ): void {
        if (this.tc.settings.contextMenu.markTask) {
            menu.addItem((item) =>
                item
                    .setTitle("(TC) Mark Task")
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
                        .setTitle("(TC) Mark with next")
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
                        .setTitle("(TC) Mark with previous")
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
                    .setTitle("(TC) Reset all tasks")
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
                    .setTitle("(TC) Collect tasks")
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

    registerCommands(): void {
        if (!this.commandsRegistered) {
            this.tc.logDebug("register commands");
            this.commandsRegistered = true;

            const markTaskCommand: Command = {
                id: "task-collector-mark",
                name: "Mark task",
                icon: "check-square",
                editorCallback: async (editor: Editor, view: MarkdownView) => {
                    const mark = await promptForMark(this.app, this.tc);
                    if (mark) {
                        const selection =
                            this.getCurrentLinesFromEditor(editor);
                        await this.editLines(mark, selection.lines);
                        this.restoreCursor(selection, editor);
                    }
                },
            };
            this.addCommand(markTaskCommand);

            const resetAllTaskCommand: Command = {
                id: "task-collector-reset-all-tasks",
                name: "Reset all tasks",
                icon: "blocks",
                callback: async () => {
                    this.resetAllTasks();
                },
            };
            this.addCommand(resetAllTaskCommand);

            if (this.tc.settings.collectionEnabled) {
                const moveAllTaskCommand: Command = {
                    id: "task-collector-move-completed-tasks",
                    name: "Collect tasks",
                    icon: "tornado",
                    callback: async () => {
                        this.collectTasks();
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
                        view: MarkdownView,
                    ) => {
                        this.tc.logDebug(
                            `${markWithNextCommand.id}: callback`,
                            editor,
                            view,
                        );
                        const selection =
                            this.getCurrentLinesFromEditor(editor);
                        await this.markInCycle(Direction.NEXT, selection.lines);
                        this.restoreCursor(selection, editor);
                    },
                };
                this.addCommand(markWithNextCommand);

                const markWithPrevCommand: Command = {
                    id: "task-collector-mark-prev",
                    name: "Mark with previous",
                    icon: "reply",
                    editorCallback: async (
                        editor: Editor,
                        view: MarkdownView,
                    ) => {
                        this.tc.logDebug(
                            `${markWithPrevCommand.id}: callback`,
                            editor,
                            view,
                        );
                        const selection =
                            this.getCurrentLinesFromEditor(editor);
                        await this.markInCycle(Direction.PREV, selection.lines);
                        this.restoreCursor(selection, editor);
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
                            view: MarkdownView,
                        ) => {
                            const selection =
                                this.getCurrentLinesFromEditor(editor);
                            this.tc.logDebug(
                                `${command.id}: callback`,
                                selection,
                                editor,
                                view,
                            );
                            await this.editLines(k, selection.lines);
                            this.restoreCursor(selection, editor);
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
                        this.buildContextMenu(
                            menu,
                            info,
                            this.getCurrentLinesFromEditor(editor),
                        );
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
                    let parent = ctx.containerEl as HTMLElement;
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

                    for (const checkbox of Array.from(checkboxes)) {
                        const line =
                            Number(lineStart) + Number(checkbox.dataset.line);

                        this.tc.logDebug("checkbox", checkbox, line);
                        checkbox.setAttribute("data-tc-line", line.toString());

                        if (this.tc.cache.useContextMenu) {
                            this.registerDomEvent(
                                checkbox.parentElement,
                                "contextmenu",
                                (ev) => {
                                    const view =
                                        this.app.workspace.getActiveViewOfType(
                                            MarkdownView,
                                        );
                                    if (view) {
                                        const menu = new Menu();
                                        this.buildContextMenu(menu, view, {
                                            start: {
                                                line,
                                                ch: 0,
                                            },
                                            lines: [line],
                                        });
                                        menu.showAtMouseEvent(ev);
                                    }
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
        console.log("unloading Task Collector");
        this.unregisterCommands();
        this.unregisterHandlers();
    }

    async loadSettings(): Promise<void> {
        const obj = Object.assign({}, await this.loadData());
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

                this.eventHandler = async (ev: MouseEvent) => {
                    const { target } = ev;
                    const activeFile = this.tcp.app.workspace.getActiveFile();
                    if (
                        !activeFile ||
                        !(target instanceof HTMLInputElement) ||
                        target.type !== "checkbox" ||
                        target.classList.contains("metadata-input-checkbox")
                    ) {
                        return false;
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
                        return false;
                    }
                    await this.tcp.app.vault.process(
                        activeFile,
                        (source): string => {
                            const position = this.view.posAtDOM(target);
                            const line = view.state.doc.lineAt(position);
                            const i = source
                                .split("\n")
                                .findIndex((c) => c === line.text);

                            tc.logDebug(
                                "TC ViewPlugin: mark task",
                                activeFile.path,
                                mark,
                                line,
                                i,
                            );

                            if (tcp.tc.anyTaskMark.test(line.text)) {
                                return tc.markSelectedTask(source, mark, [i]);
                            }
                            const offset = Number(target.dataset.line);
                            return tc.markSelectedTask(source, mark, [
                                i + offset,
                            ]);
                        },
                    );

                    return true;
                };
                this.eventHandler.bind(this);

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
