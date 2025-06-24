import { type App, Modal } from "obsidian";
import type { TaskCollector } from "./taskcollector-TaskCollector";

export function promptForMark(
    app: App,
    taskCollector: TaskCollector,
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
            "taskcollector-selector markdown-preview-view",
        );

        const completedList = selector.createEl("ul");
        completedList.addClass("contains-task-list");
        this.addTaskValues(
            completedList,
            this.taskCollector.cache.completedMarks,
            true,
        );

        const list = selector.createEl("ul");
        list.addClass("contains-task-list");
        this.addTaskValues(
            list,
            this.taskCollector.cache.incompleteMarks,
            false,
        );

        const footer = selector.createEl("nav");
        const esc = footer.createSpan();
        esc.innerHTML = "<b>esc</b> to dismiss";
        const bksp = footer.createSpan();
        bksp.innerHTML = "<b>bksp</b> to remove <code>[]</code>";

        const keyListener = (event: KeyboardEvent) => {
            switch (event.key) {
                case "ArrowLeft":
                case "ArrowRight":
                case "ArrowUp":
                case "ArrowDown":
                case "CapsLock":
                case "Tab":
                    break;
                default: {
                    this.chosenMark = event.key;
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    this.close();
                }
            }
        };
        this.scope.register([], null, keyListener);
        this.scope.register(["Shift"], null, keyListener);
    }

    addTaskValues(
        list: HTMLUListElement,
        choices: string,
        _markComplete: boolean,
    ): void {
        for (const character of choices) {
            const li = list.createEl("li", {
                cls: `task-list-item ${character === " " ? "" : " is-checked"}`,
                attr: {
                    "data-task": character,
                },
            });
            li.addEventListener("click", (_event) => {
                this.chosenMark = character;
                this.close();
            });

            const input = li.createEl("input", {
                cls: "task-list-item-checkbox",
                attr: {
                    id: `task-list-item-checkbox-${character}`,
                    type: "checkbox",
                    style: "pointer-events: none;",
                },
            });
            if (character !== " ") {
                input.setAttribute("checked", "");
            }
            li.createEl("span", {
                text: character === " " ? "␣" : character,
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
