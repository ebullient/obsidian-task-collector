import { App, Editor, MarkdownView, Modal } from "obsidian";
import { TaskCollector } from "./taskcollector-TaskCollector";

export class TaskMarkModal extends Modal {
    editor: Editor;
    view: MarkdownView;
    taskCollector: TaskCollector;

    constructor(app: App, editor: Editor, view: MarkdownView, taskCollector: TaskCollector) {
        super(app);
        this.editor = editor;
        this.view = view;
        this.taskCollector = taskCollector;
        this.containerEl.id = "taskcollector-modal";
    }

    onOpen(): void {
        const selector = this.contentEl.createDiv("taskcollector-selector markdown-preview-view");
        const completedTasks = this.taskCollector.settings.supportCanceledTasks ? "xX-" : "xX";

        const completedList = selector.createEl("ul");
        this.addTaskValues(completedList, completedTasks, true);

        const list = selector.createEl("ul");
        this.addTaskValues(list, this.taskCollector.settings.incompleteTaskValues, false);

        const tc = this.taskCollector;
        const editor = this.editor;
        const self = this;

        const keyListener = function (event: KeyboardEvent) {
            if ( completedTasks.contains(event.key)) {
                tc.markTaskOnCurrentLine(editor, event.key);
                event.preventDefault();
                event.stopImmediatePropagation();
            } else if ( tc.settings.incompleteTaskValues.contains(event.key) ) {
                tc.resetTaskOnCurrentLine(editor, event.key);
                event.preventDefault();
                event.stopImmediatePropagation();
            }
            self.close();
        };
        this.scope.register([], null, keyListener);
        this.scope.register(["Shift"], null, keyListener);
    }

    addTaskValues(list: HTMLUListElement, choices: string, markComplete: boolean): void {
        const tc = this.taskCollector;
        const editor = this.editor;
        const self = this;
        for (const character of choices) {
            const li = list.createEl("li", {
                cls: "task-list-item" + (character == ' ' ? "" : " is-checked"),
                attr: {
                    "data-task": character
                }
            });
            if ( markComplete ) {
                li.addEventListener("click", function (event) {
                    tc.markTaskOnCurrentLine(editor, character);
                    self.close();
                });
            } else {
                li.addEventListener("click", function (event) {
                    tc.resetTaskOnCurrentLine(editor, character);
                    self.close();
                });
            }
            const input = li.createEl("input", {
                cls: "task-list-item-checkbox",
                attr: {
                    "id": "task-list-item-checkbox-" + character,
                    "type": "checkbox",
                    "style": "pointer-events: none;"
                }
            });
            if ( character != ' ' ) {
                input.setAttribute("checked", "");
            }
            li.createEl("span", {
                text: character == ' ' ? '␣' : character,
                attr: {
                    "style": "pointer-events: none;"
                }
            });
        }
    }

    onClose(): void {
        this.contentEl.empty();
    }
}
