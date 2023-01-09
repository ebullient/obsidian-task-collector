import {
    addIcon,
    Editor,
    MarkdownView,
    Plugin,
    Command,
    Menu,
    EventRef,
    MarkdownPostProcessor,
    MarkdownPreviewRenderer,
    MarkdownFileInfo,
} from "obsidian";
import { TaskCollector } from "./taskcollector-TaskCollector";
import { TaskCollectorSettingsTab } from "./taskcollector-SettingsTab";
import { promptForMark } from "./taskcollector-TaskMarkModal";
import { API } from "./@types/api";
import { TaskCollectorApi } from "./taskcollector-Api";
import { Data } from "./taskcollector-Data";

enum Icons {
    CANCEL = "tc-cancel-item",
    RESET = "tc-reset-item",
    MARK = "tc-mark-item",
    COMPLETE_ALL = "tc-complete-all-items",
    CLEAR_ALL = "tc-clear-all-items",
    MOVE = "tc-move-all-checked-items",
}

declare module "obsidian" {
    interface App {
        commands: {
            removeCommand(id: string): void;
        };
    }
}

export class TaskCollectorPlugin extends Plugin {
    tc: TaskCollector;
    handlersRegistered = false;
    fileContextMenu: EventRef;
    editTaskContextMenu: EventRef;
    postProcessor: MarkdownPostProcessor;
    commands: Map<string, Command>;

    /** External-facing plugin API. */
    public api: API;

    async onload(): Promise<void> {
        console.info("loading Task Collector (TC) v" + this.manifest.version);

        this.tc = new TaskCollector();
        this.addSettingTab(
            new TaskCollectorSettingsTab(this.app, this, this.tc)
        );
        await this.loadSettings();
        this.commands = new Map(); // (char, command)

        addIcon(
            Icons.RESET,
            '<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-square-fill" viewBox="0 0 16 16"><path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2z"/></svg>'
        );
        addIcon(
            Icons.MARK,
            '<svg class="bi bi-square-fill" fill="currentColor" version="1.1" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path transform="scale(.16)" d="m12.5 0a12.5 12.5 0 00-12.5 12.5v75a12.5 12.5 0 0012.5 12.5h75a12.5 12.5 0 0012.5-12.5v-75a12.5 12.5 0 00-12.5-12.5h-75zm38.146 21.135 8.7324 19.098 20.684 3.6328-15.465 14.207 2.9355 20.793-18.289-10.316-18.869 9.2188 4.1602-20.584-14.598-15.098 20.861-2.4043 9.8477-18.547z" stroke-width="6.25"/></svg>'
        );
        addIcon(
            Icons.MOVE,
            '<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-save-fill" viewBox="0 0 16 16">  <path d="M8.5 1.5A1.5 1.5 0 0 1 10 0h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h6c-.314.418-.5.937-.5 1.5v7.793L4.854 6.646a.5.5 0 1 0-.708.708l3.5 3.5a.5.5 0 0 0 .708 0l3.5-3.5a.5.5 0 0 0-.708-.708L8.5 9.293V1.5z"/></svg>'
        );

        const markTaskCommand: Command = {
            id: "task-collector-mark",
            name: "Mark task",
            icon: Icons.MARK,
            editorCallback: async (editor: Editor, view: MarkdownView) => {
                const mark = await promptForMark(this.app, this.tc);
                if (mark) {
                    this.markTaskOnLines(
                        mark,
                        this.getCurrentLinesFromEditor(editor)
                    );
                }
            },
        };

        if (this.tc.settings.collectionEnabled) {
            const moveAllTaskCommand: Command = {
                id: "task-collector-move-completed-tasks",
                name: "Collect tasks",
                icon: Icons.MOVE,
                callback: async () => {
                    this.collectTasks();
                },
            };
            this.addCommand(moveAllTaskCommand);
        }

        this.addCommand(markTaskCommand);

        this.registerHandlers();
        this.api = new TaskCollectorApi(this.app, this.tc);
    }

    getCurrentLinesFromEditor(editor: Editor): number[] {
        const lines: number[] = [];
        if (editor.somethingSelected()) {
            const cursorStart = editor.getCursor("from");
            const cursorEnd = editor.getCursor("to");
            for (let i = cursorStart.line; i <= cursorEnd.line; i++) {
                lines.push(i);
            }
        } else {
            const anchor = editor.getCursor("from");
            lines.push(anchor.line);
        }
        return lines;
    }

    buildContextMenu(
        menu: Menu,
        info: MarkdownView | MarkdownFileInfo,
        lines?: number[]
    ): void {
        this.tc.logDebug("TODO: buildContextMenu", info, menu, lines);

        if (this.tc.settings.contextMenu.markTask) {
            menu.addItem((item) =>
                item
                    .setTitle("(TC) Mark Task")
                    .setIcon(Icons.MARK)
                    .onClick(async () => {
                        const mark = await promptForMark(this.app, this.tc);
                        if (mark) {
                            this.markTaskOnLines(mark, lines);
                        }
                    })
            );
        }
        // dynamic/optional menu items
        Object.entries(this.tc.cache.marks).forEach(([k, ms]) => {
            this.tc.logDebug("context menu check", k, ms.useContextMenu, ms);
            if (ms.useContextMenu) {
                menu.addItem((item) =>
                    item
                        .setTitle(`(TC) Mark Task: ${k}`)
                        .setIcon(Icons.MARK)
                        .onClick(async () => {
                            this.markTaskOnLines(k, lines);
                        })
                );
            }
        });
        if (this.tc.settings.contextMenu.resetTask) {
            menu.addItem((item) =>
                item
                    .setTitle("(TC) Reset Task")
                    .setIcon(Icons.RESET)
                    .onClick(() => {
                        this.markTaskOnLines(" ", lines);
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
                    .setIcon(Icons.MOVE)
                    .onClick(async () => {
                        this.collectTasks();
                    })
            );
        }
    }

    registerHandlers(): void {
        if (!this.handlersRegistered) {
            this.tc.logDebug("register handlers");
            this.handlersRegistered = true;

            // Dynamic commands
            Object.entries(this.tc.cache.marks).forEach(([k, ms]) => {
                this.tc.logDebug(
                    "register commands",
                    k,
                    ms.registerCommand,
                    ms
                );
                if (ms.registerCommand) {
                    this.tc.logDebug("register command:", k, ms);

                    const command: Command = {
                        id: `task-collector-mark-task-${k}`,
                        name: `Mark selected task with ${k}`,
                        icon: Icons.MARK,
                        editorCallback: (
                            editor: Editor,
                            view: MarkdownView
                        ) => {
                            this.markTaskOnLines(
                                k,
                                this.getCurrentLinesFromEditor(editor)
                            );
                        },
                    };
                    this.commands.set(k, command);
                    this.addCommand(command);
                }
            });

            // Source / Edit mode: line context event
            if (this.tc.cache.useContextMenu) {
                this.registerEvent(
                    (this.editTaskContextMenu = this.app.workspace.on(
                        "editor-menu",
                        (menu, editor, info) => {
                            this.tc.logDebug(
                                "TODO: editor-menu",
                                menu,
                                editor,
                                info
                            );
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

            // Preview / Live Preview: register post-processor
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

                        const section = ctx.getSectionInfo(el);
                        if (!section) return;

                        const { lineStart } = section;

                        for (const checkbox of Array.from(checkboxes)) {
                            const line = Number(checkbox.dataset.line);

                            if (this.tc.cache.useContextMenu) {
                                this.registerDomEvent(
                                    checkbox.parentElement,
                                    "contextmenu",
                                    (ev) => {
                                        ev.stopImmediatePropagation();
                                        ev.preventDefault();
                                        const view =
                                            this.app.workspace.getActiveViewOfType(
                                                MarkdownView
                                            );
                                        if (view && view.editor) {
                                            this.tc.logDebug(
                                                "TODO: right click on task?",
                                                ev,
                                                lineStart,
                                                line
                                            );
                                            const menu = new Menu();
                                            this.buildContextMenu(menu, view, [
                                                lineStart + line,
                                            ]);
                                            menu.showAtMouseEvent(ev);
                                        }
                                    }
                                );
                            }
                            if (this.tc.settings.previewClickModal) {
                                this.registerDomEvent(
                                    checkbox,
                                    "click",
                                    async (ev) => {
                                        this.tc.logDebug(
                                            "TODO: left click on task?",
                                            ev,
                                            lineStart,
                                            line
                                        );
                                        ev.stopImmediatePropagation();
                                        ev.preventDefault();
                                        const mark = await promptForMark(
                                            this.app,
                                            this.tc
                                        );
                                        if (mark) {
                                            this.markTaskOnLines(mark, [
                                                lineStart + line,
                                            ]);
                                        }
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

        for (const c of this.commands.values()) {
            this.app.commands.removeCommand(c.id);
        }
        this.commands.clear();

        if (this.fileContextMenu) {
            this.app.workspace.offref(this.fileContextMenu);
            this.fileContextMenu = null;
        }

        if (this.editTaskContextMenu) {
            this.app.workspace.offref(this.editTaskContextMenu);
            this.editTaskContextMenu = null;
        }

        if (this.postProcessor) {
            MarkdownPreviewRenderer.unregisterPostProcessor(this.postProcessor);
            this.postProcessor = null;
        }
    }

    async markTaskOnLines(mark: string, lines?: number[]): Promise<void> {
        const activeFile = this.app.workspace.getActiveFile();
        const source = await this.app.vault.read(activeFile);
        const result = this.tc.markSelectedTask(source, mark, lines);
        this.app.vault.modify(activeFile, result);
    }

    async collectTasks(): Promise<void> {
        const activeFile = this.app.workspace.getActiveFile();
        const source = await this.app.vault.read(activeFile);
        const result = this.tc.moveAllTasks(source);
        this.app.vault.modify(activeFile, result);
    }

    async resetAllTasks(): Promise<void> {
        const activeFile = this.app.workspace.getActiveFile();
        const source = await this.app.vault.read(activeFile);
        const result = this.tc.resetAllMarkedTasks(source);
        this.app.vault.modify(activeFile, result);
    }

    onunload(): void {
        console.log("unloading Task Collector");
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
    }
}
