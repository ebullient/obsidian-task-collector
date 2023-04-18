import {
    Editor,
    EditorPosition,
    MarkdownView,
    Plugin,
    Command,
    Menu,
    EventRef,
    MarkdownPostProcessor,
    MarkdownPreviewRenderer,
    MarkdownFileInfo,
} from "obsidian";
import { Direction, TaskCollector } from "./taskcollector-TaskCollector";
import { TaskCollectorSettingsTab } from "./taskcollector-SettingsTab";
import { promptForMark } from "./taskcollector-TaskMarkModal";
import { API } from "./@types/api";
import { TaskCollectorApi } from "./taskcollector-Api";
import { Data } from "./taskcollector-Data";
import { TEXT_ONLY_MARK } from "./taskcollector-Constants";

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

    /** External-facing plugin API. */
    public api: API;

    async onload(): Promise<void> {
        console.info("loading Task Collector (TC) v" + this.manifest.version);

        this.tc = new TaskCollector();
        this.addSettingTab(
            new TaskCollectorSettingsTab(this.app, this, this.tc)
        );
        await this.loadSettings();

        this.registerCommands();
        this.registerHandlers();
        this.api = new TaskCollectorApi(this.app, this.tc);
    }

    async markInCycle(direction: Direction, lines?: number[]): Promise<void> {
        const activeFile = this.app.workspace.getActiveFile();
        const source = await this.app.vault.read(activeFile);
        const result = this.tc.markInCycle(source, direction, lines);
        await this.app.vault.modify(activeFile, result);
    }

    async editLines(mark: string, lines?: number[]): Promise<void> {
        const activeFile = this.app.workspace.getActiveFile();
        const source = await this.app.vault.read(activeFile);
        const result = this.tc.markSelectedTask(source, mark, lines);
        await this.app.vault.modify(activeFile, result);
    }

    async collectTasks(): Promise<void> {
        const activeFile = this.app.workspace.getActiveFile();
        const source = await this.app.vault.read(activeFile);
        const result = this.tc.moveAllTasks(source);
        await this.app.vault.modify(activeFile, result);
    }

    async resetAllTasks(): Promise<void> {
        const activeFile = this.app.workspace.getActiveFile();
        const source = await this.app.vault.read(activeFile);
        const result = this.tc.resetAllTasks(source);
        this.app.vault.modify(activeFile, result);
    }

    getCurrentLinesFromEditor(editor: Editor): Selection {
        this.tc.logDebug(
            "from: %o, to: %o, anchor: %o, head: %o, general: %o",
            editor.getCursor("from"),
            editor.getCursor("to"),
            editor.getCursor("anchor"),
            editor.getCursor("head"),
            editor.getCursor()
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
        selection: Selection
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
                    })
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
                                selection
                            );
                            await this.markInCycle(
                                Direction.NEXT,
                                selection.lines
                            );
                            this.restoreCursor(selection, info.editor);
                        })
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
                                selection
                            );
                            await this.markInCycle(
                                Direction.PREV,
                                selection.lines
                            );
                            this.restoreCursor(selection, info.editor);
                        })
                );
            }
        }
        // dynamic/optional menu items
        Object.entries(this.tc.cache.marks).forEach(([k, ms]) => {
            if (ms.useContextMenu) {
                menu.addItem((item) =>
                    item
                        .setTitle(
                            k === TEXT_ONLY_MARK
                                ? "(TC) Append text"
                                : `(TC) Mark with '${k}'`
                        )
                        .setIcon("check-circle")
                        .onClick(async () => {
                            this.tc.logDebug(
                                `Mark with '${k}'`,
                                menu,
                                info,
                                selection
                            );
                            await this.editLines(k, selection.lines);
                            this.restoreCursor(selection, info.editor);
                        })
                );
            }
        });

        if (this.tc.settings.contextMenu.resetAllTasks) {
            menu.addItem((item) =>
                item
                    .setTitle("(TC) Reset all tasks")
                    .setIcon("blocks")
                    .onClick(async () => {
                        this.tc.logDebug("Reset all tasks", menu, info);
                        await this.resetAllTasks();
                        this.restoreCursor(selection, info.editor);
                    })
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
                    })
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
                        view: MarkdownView
                    ) => {
                        this.tc.logDebug(
                            `${markWithNextCommand.id}: callback`,
                            editor,
                            view
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
                        view: MarkdownView
                    ) => {
                        this.tc.logDebug(
                            `${markWithPrevCommand.id}: callback`,
                            editor,
                            view
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
            Object.entries(this.tc.cache.marks).forEach(([k, ms]) => {
                if (ms.registerCommand) {
                    const command: Command = {
                        id: `task-collector-mark-task-${k}`,
                        name:
                            k == TEXT_ONLY_MARK
                                ? "Append text"
                                : `Mark with '${k}'`,
                        icon:
                            k == TEXT_ONLY_MARK ? "list-plus" : "check-circle",
                        editorCallback: async (
                            editor: Editor,
                            view: MarkdownView
                        ) => {
                            const selection =
                                this.getCurrentLinesFromEditor(editor);
                            this.tc.logDebug(
                                `${command.id}: callback`,
                                selection,
                                editor,
                                view
                            );
                            await this.editLines(k, selection.lines);
                            this.restoreCursor(selection, editor);
                        },
                    };
                    this.addCommand(command);
                }
            });

            // If resetAll is enabled
            if (this.tc.settings.contextMenu.resetAllTasks) {
                const resetAllTaskCommand: Command = {
                    id: "task-collector-reset-all-tasks",
                    name: "Reset all tasks",
                    icon: "blocks",
                    callback: async () => {
                        this.resetAllTasks();
                    },
                };
                this.addCommand(resetAllTaskCommand);
            }
        }
    }

    unregisterCommands(): void {
        this.tc.logDebug("unregister commands");
        this.commandsRegistered = false;

        const oldCommands = Object.keys(app.commands.commands).filter((p) =>
            p.startsWith("task-collector-")
        );
        for (const command of oldCommands) {
            app.commands.removeCommand(command);
        }
    }

    registerHandlers(): void {
        if (!this.handlersRegistered) {
            this.tc.logDebug("register handlers");
            this.handlersRegistered = true;

            // Source / Live Preview mode: register context menu
            if (this.tc.cache.useContextMenu) {
                this.registerEvent(
                    (this.editTaskContextMenu = this.app.workspace.on(
                        "editor-menu",
                        async (menu, editor, info) => {
                            //get line selections here
                            this.buildContextMenu(
                                menu,
                                info,
                                this.getCurrentLinesFromEditor(editor)
                            );
                        }
                    ))
                );
            }

            // Reading mode: register post-processor
            if (
                this.tc.cache.useContextMenu ||
                this.tc.settings.previewClickModal
            ) {
                this.registerMarkdownPostProcessor(
                    (this.postProcessor = (el, ctx) => {
                        const checkboxes =
                            el.querySelectorAll<HTMLInputElement>(
                                ".task-list-item-checkbox"
                            );
                        if (!checkboxes.length) return;

                        this.tc.logDebug(
                            "markdown postprocessor",
                            el,
                            ctx,
                            checkboxes
                        );

                        for (const checkbox of Array.from(checkboxes)) {
                            const section = ctx.getSectionInfo(checkbox);
                            if (!section) continue;

                            const { lineStart } = section;
                            const line = Number(checkbox.dataset.line);

                            if (this.tc.cache.useContextMenu) {
                                this.registerDomEvent(
                                    checkbox.parentElement,
                                    "contextmenu",
                                    (ev) => {
                                        const view =
                                            this.app.workspace.getActiveViewOfType(
                                                MarkdownView
                                            );
                                        if (view) {
                                            const menu = new Menu();
                                            this.buildContextMenu(menu, view, {
                                                start: {
                                                    line: lineStart + line,
                                                    ch: 0,
                                                },
                                                lines: [lineStart + line],
                                            });
                                            menu.showAtMouseEvent(ev);
                                        }
                                    }
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
                                            this.tc
                                        );
                                        if (mark) {
                                            await this.editLines(mark, [
                                                lineStart + line,
                                            ]);
                                        }
                                        ev.stopImmediatePropagation();
                                        ev.preventDefault();
                                    }
                                );
                            }
                        }
                    })
                );
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
        this.tc.logDebug("save settings");
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
