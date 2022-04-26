import { App } from "obsidian";
import { API } from "./@types/api";
import { TaskCollector } from "./taskcollector-TaskCollector";
import { promptForMark } from "./taskcollector-TaskMarkModal";

export class TaskCollectorApi implements API {
    app: App;
    taskCollector: TaskCollector;

    constructor(app: App, taskCollector: TaskCollector) {
        this.app = app;
        this.taskCollector = taskCollector;
    }

    getCompletedTaskValues(): string {
        return this.taskCollector.initSettings.completedTasks;
    }

    getIncompleteTaskValues(): string {
        return this.taskCollector.settings.incompleteTaskValues;
    }

    getMark(): Promise<string> {
        return promptForMark(this.app, this.taskCollector);
    }

    isComplete(value: string): boolean {
        // This may include cancelled items (those are still "complete")
        return this.getCompletedTaskValues().contains(value);
    }
    isCanceled(value: string): boolean {
        return value === "-";
    }
}
