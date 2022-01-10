import { App, Modal } from "obsidian";
import { TaskCollector } from "./taskcollector-TaskCollector";

export function getMark(
    app: App,
    taskCollector: TaskCollector
): Promise<string> {
    return new Promise((resolve) => {
        const modal = new TaskMarkModal(app, taskCollector);

        modal.onClose = () => {
            resolve(modal.chosenMark);
        };

        modal.open();
    });
}

export class TaskMarkModal extends Modal {
    taskCollector: TaskCollector;
    chosenMark: string;
    constructor(app: App, taskCollector: TaskCollector) {
        super(app);
        this.taskCollector = taskCollector;
        this.containerEl.id = "taskcollector-modal";
    }

    onOpen(): void {
        const selector = this.contentEl.createDiv(
            "taskcollector-selector markdown-preview-view"
        );
        const completedTasks = this.taskCollector.settings.supportCanceledTasks
            ? "xX-"
            : "xX";

        const completedList = selector.createEl("ul");
        this.addTaskValues(completedList, completedTasks, true);

        const list = selector.createEl("ul");
        this.addTaskValues(
            list,
            this.taskCollector.settings.incompleteTaskValues,
            false
        );

        const tc = this.taskCollector;
        const self = this;

        const keyListener = function (event: KeyboardEvent) {
            if (completedTasks.contains(event.key)) {
                self.chosenMark = event.key;
                event.preventDefault();
                event.stopImmediatePropagation();
            } else if (tc.settings.incompleteTaskValues.contains(event.key)) {
                self.chosenMark = event.key;
                event.preventDefault();
                event.stopImmediatePropagation();
            }
            self.close();
        };
        this.scope.register([], null, keyListener);
        this.scope.register(["Shift"], null, keyListener);
    }

    addTaskValues(
        list: HTMLUListElement,
        choices: string,
        markComplete: boolean
    ): void {
        const self = this;
        for (const character of choices) {
            const li = list.createEl("li", {
                cls: "task-list-item" + (character == " " ? "" : " is-checked"),
                attr: {
                    "data-task": character,
                },
            });
            li.addEventListener("click", function (event) {
                self.chosenMark = character;
                self.close();
            });

            const input = li.createEl("input", {
                cls: "task-list-item-checkbox",
                attr: {
                    id: "task-list-item-checkbox-" + character,
                    type: "checkbox",
                    style: "pointer-events: none;",
                },
            });
            if (character != " ") {
                input.setAttribute("checked", "");
            }
            li.createEl("span", {
                text: character == " " ? "␣" : character,
                attr: {
                    style: "pointer-events: none;",
                },
            });
        }
    }

    onClose(): void {
        this.contentEl.empty();
    }
}
