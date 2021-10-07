import { addIcon, Editor, MarkdownView, Plugin, Command } from 'obsidian';
import { TaskCollector } from './TaskCollector';
import { DEFAULT_SETTINGS } from './TaskCollectorSettings';
import { TaskCollectorSettingsTab } from './TaskCollectorSettingsTab';


export default class TaskCollectorPlugin extends Plugin {
    taskCollector: TaskCollector;

    async onload(): Promise<void> {
        console.log('loading Task Collector (TC): %o', this.app);
        this.taskCollector = new TaskCollector(this.app);
        this.addSettingTab(new TaskCollectorSettingsTab(this.app, this, this.taskCollector));
        await this.loadSettings();

        addIcon("tc-complete-item", '<svg xmlns="http://www.w3.org/2000/svg" width="100px" height="100px" fill="currentColor" class="bi bi-check-square-fill" viewBox="0 0 16 16">  <path d="M2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2zm10.03 4.97a.75.75 0 0 1 .011 1.05l-3.992 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.75.75 0 0 1 1.08-.022z"/></svg>');
        addIcon("tc-cancel-item", '<svg xmlns="http://www.w3.org/2000/svg" width="100px" height="100px" fill="currentColor" class="bi bi-dash-square-fill" viewBox="0 0 16 16">  <path d="M2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2zm2.5 7.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1z"/></svg>');
        addIcon("tc-complete-all-items", '<svg class="bi bi-square-fill" fill="currentColor" version="1.1" width="100px" height="100px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="m2 0a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-12a2 2 0 00-2-2h-12zm1.5098 2.041h1.5a1.5 1.5 0 011.5 1.5v1.5a1.5 1.5 0 01-1.5 1.5h-1.5a1.5 1.5 0 01-1.5-1.5v-1.5a1.5 1.5 0 011.5-1.5zm4.3945 1.2207h5.6895a.40645.5 0 01.40625.5v1a.40645.5 0 01-.40625.5h-5.6895a.40645.5 0 01-.40625-.5v-1a.40645.5 0 01.40625-.5zm-4.4023 6.2656h1.5a1.5 1.5 0 011.5 1.5v1.5a1.5 1.5 0 01-1.5 1.5h-1.5a1.5 1.5 0 01-1.5-1.5v-1.5a1.5 1.5 0 011.5-1.5zm4.4023 1.2656h5.6895a.40645.5 0 01.40625.5v1a.40645.5 0 01-.40625.5h-5.6895a.40645.5 0 01-.40625-.5v-1a.40645.5 0 01.40625-.5z"/><g transform="translate(.49737 -.0026315)" fill="currentColor"><path d="m3.6171 13.149a.5.5 0 01-.708 0l-1-1a.50063.50063 0 01.708-.708l.646.647 1.646-1.647a.50063.50063 0 01.708.708z"/><path d="m3.6171 5.6181a.5.5 0 01-.708 0l-1-1a.50063.50063 0 11.708-.708l.646.647 1.646-1.647a.50063.50063 0 11.708.708z"/></g></svg>');
        addIcon("tc-clear-all-items", '<svg class="bi bi-square-fill" fill="currentColor" version="1.1" width="100px" height="100px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="m2 0a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-12a2 2 0 00-2-2h-12zm1.5098 2.041h1.5a1.5 1.5 0 011.5 1.5v1.5a1.5 1.5 0 01-1.5 1.5h-1.5a1.5 1.5 0 01-1.5-1.5v-1.5a1.5 1.5 0 011.5-1.5zm4.3945 1.2207h5.6895a.40645.5 0 01.40625.5v1a.40645.5 0 01-.40625.5h-5.6895a.40645.5 0 01-.40625-.5v-1a.40645.5 0 01.40625-.5zm-4.4023 6.2656h1.5a1.5 1.5 0 011.5 1.5v1.5a1.5 1.5 0 01-1.5 1.5h-1.5a1.5 1.5 0 01-1.5-1.5v-1.5a1.5 1.5 0 011.5-1.5zm4.4023 1.2656h5.6895a.40645.5 0 01.40625.5v1a.40645.5 0 01-.40625.5h-5.6895a.40645.5 0 01-.40625-.5v-1a.40645.5 0 01.40625-.5z"/></svg>');
        addIcon("tc-move-all-checked-items", '<svg xmlns="http://www.w3.org/2000/svg" width="100px" height="100px" fill="currentColor" class="bi bi-save-fill" viewBox="0 0 16 16">  <path d="M8.5 1.5A1.5 1.5 0 0 1 10 0h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h6c-.314.418-.5.937-.5 1.5v7.793L4.854 6.646a.5.5 0 1 0-.708.708l3.5 3.5a.5.5 0 0 0 .708 0l3.5-3.5a.5.5 0 0 0-.708-.708L8.5 9.293V1.5z"/></svg>');

        const completeTaskCommand: Command = {
            id: "task-collector-mark-done",
            name: "Complete item",
            icon: "tc-complete-item",
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.taskCollector.markTaskOnCurrentLine(editor, 'x');
            }
        };

        const cancelTaskCommand: Command = {
            id: "task-collector-mark-canceled",
            name: "Cancel item",
            icon: "tc-cancel-item",
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.taskCollector.markTaskOnCurrentLine(editor, '-');
            }
        };

        const completeAllTasksCommand: Command = {
            id: "task-collector-mark-all-done",
            name: "Complete all tasks",
            icon: "tc-complete-all-items",
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.taskCollector.markAllTasks(editor, 'x');
            }
        };

        const clearAllTasksCommand: Command = {
            id: "task-collector-clear-all-items",
            name: "Reset all completed tasks",
            icon: "tc-clear-all-items",
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.taskCollector.resetAllTasks(editor);
            }
        };

        const moveTaskCommand: Command = {
            id: "task-collector-move-completed-tasks",
            name: "Move all completed tasks to configured heading",
            icon: "tc-move-all-checked-items",
            editorCallback: async (editor: Editor, view: MarkdownView) => {
                this.taskCollector.moveCompletedTasksInFile(editor);
            },
        };

        this.addCommand(completeTaskCommand);
        if (this.taskCollector.settings.supportCanceledTasks) {
            this.addCommand(cancelTaskCommand);
        }
        this.addCommand(moveTaskCommand);
        this.addCommand(completeAllTasksCommand);
        this.addCommand(clearAllTasksCommand);

        if (this.taskCollector.settings.rightClickComplete || this.taskCollector.settings.rightClickMove) {
            this.registerEvent(
                this.app.workspace.on("editor-menu", (menu) => {

                    // if right-click complete menu items is enabled
                    if (this.taskCollector.settings.rightClickComplete) {
                        menu.addItem((item) => item
                            .setTitle("(TC) Complete Task")
                            .setIcon(completeTaskCommand.icon)
                            .onClick(() => {
                                //@ts-ignore
                                this.app.commands.executeCommandById(completeTaskCommand.id);
                            })
                        );

                        // if cancelling items is supported, add the menu item for that.
                        if (this.taskCollector.settings.supportCanceledTasks) {
                            menu.addItem((item) => item
                                .setTitle("(TC) Cancel Task")
                                .setIcon(cancelTaskCommand.icon)
                                .onClick(() => {
                                    //@ts-ignore
                                    this.app.commands.executeCommandById(cancelTaskCommand.id);
                                })
                            );
                        }
                    }

                    // If right-click move completed items is enabled:
                    if (this.taskCollector.settings.rightClickMove) {
                        menu.addItem((item) => item
                            .setTitle("(TC) Move completed tasks")
                            .setIcon(moveTaskCommand.icon)
                            .onClick(() => {
                                //@ts-ignore
                                this.app.commands.executeCommandById(moveTaskCommand.id);
                            })
                        );
                    }

                    // If right-click toggle-all menu items are enabled:
                    if (this.taskCollector.settings.rightClickToggleAll) {
                        menu.addItem((item) => item
                            .setTitle("(TC) Complete All Tasks")
                            .setIcon(completeAllTasksCommand.icon)
                            .onClick(() => {
                                //@ts-ignore
                                this.app.commands.executeCommandById(completeAllTasksCommand.id);
                            })
                        );

                        menu.addItem((item) => item
                            .setTitle("(TC) Reset All Tasks")
                            .setIcon(clearAllTasksCommand.icon)
                            .onClick(() => {
                                //@ts-ignore
                                this.app.commands.executeCommandById(clearAllTasksCommand.id);
                            })
                        );
                    }
                })
            );
        }
    }

    onunload(): void {
        console.log('unloading Task Collector');
    }

    async loadSettings(): Promise<void> {
        const settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        this.taskCollector.updateSettings(settings);
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.taskCollector.settings);
    }
}


