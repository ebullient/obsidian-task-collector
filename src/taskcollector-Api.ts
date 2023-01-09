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
        return this.taskCollector.cache.completedMarks;
    }

    getIncompleteTaskValues(): string {
        return this.taskCollector.cache.incompleteMarks;
    }

    getMark(): Promise<string> {
        return promptForMark(this.app, this.taskCollector);
    }

    isComplete(value: string): boolean {
        return this.getCompletedTaskValues().contains(value);
    }
    isCanceled(value: string): boolean {
        return value === "-";
    }
}
