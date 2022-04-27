import { App, moment } from "obsidian";
import {
    TaskCollectorSettings,
    CompiledTasksSettings,
} from "./taskcollector-Settings";

export class TaskCollector {
    settings: TaskCollectorSettings;
    initSettings: CompiledTasksSettings;
    anyListItem: RegExp;
    taskMark: RegExp;
    anyTaskMark: RegExp;
    blockQuote: RegExp;
    blockRef: RegExp;
    continuation: RegExp;
    stripTask: RegExp;

    constructor(private app: App) {
        this.app = app;
        this.anyListItem = new RegExp(/^([\s>]*- )([^\\[].*)$/);
        this.anyTaskMark = new RegExp(/^([\s>]*- \[)(.)(\] .*)$/);
        this.blockQuote = new RegExp(/^(\s*>[\s>]*)(.*)$/);
        this.blockRef = new RegExp(/^(.*?)( \^[A-Za-z0-9-]+)?$/);
        this.continuation = new RegExp(/^( {2,}|\t)/);
        this.stripTask = new RegExp(/^([\s>]*-) \[.\] (.*)$/);
    }

    updateSettings(settings: TaskCollectorSettings): void {
        this.settings = settings;
        let momentMatchString = null;

        if (settings.appendDateFormat) {
            // YYYY-MM-DD or DD MM, YYYY or .. [(]YYYY-MM-DD[)] where the stuff in the brackets is literal
            const literals = [];

            const regex1 = RegExp("(\\[.*?\\]\\]?)", "g");
            let match;
            let i = 0;

            momentMatchString = settings.appendDateFormat;
            while ((match = regex1.exec(momentMatchString)) !== null) {
                momentMatchString = momentMatchString.replace(
                    match[0],
                    `%$${i}$%`
                );
                literals.push(
                    match[0]
                        .substring(1, match[0].length - 1)
                        .replace(/\(/g, "\\(") // escape a naked (
                        .replace(/\)/g, "\\)") // escape a naked )
                        .replace(/\[/g, "\\[") // escape a naked [
                        .replace(/\]/g, "\\]")
                ); // escape a naked ]
                i++;
            }

            // Now let's replace moment date formatting
            momentMatchString = momentMatchString
                .replace("YYYY", "\\d{4}") // 4-digit year
                .replace("YY", "\\d{2}") // 2-digit year
                .replace("DD", "\\d{2}") // day of month, padded
                .replace("D", "\\d{1,2}") // day of month, not padded
                .replace("MMM", "[A-Za-z]{3}") // month, abbrv
                .replace("MM", "\\d{2}") // month, padded
                .replace("M", "\\d{1,2}") // month, not padded
                .replace("HH", "\\d{2}") // 24-hour, padded
                .replace("H", "\\d{1,2}") // 24-hour, not padded
                .replace("hh", "\\d{2}") // 12-hour, padded
                .replace("h", "\\d{1,2}") // 12-hour, not padded
                .replace("mm", "\\d{2}") // minute, padded
                .replace("m", "\\d{1,2}"); // minute, not padded

            if (literals.length > 0) {
                for (let i = 0; i < literals.length; i++) {
                    momentMatchString = momentMatchString.replace(
                        `%$${i}$%`,
                        literals[i]
                    );
                }
            }
            momentMatchString = `\\s*${momentMatchString}\\s*`;
        }

        const completedTasks =
            (this.settings.onlyLowercaseX ? "x" : "xX") +
            (this.settings.supportCanceledTasks ? "-" : "");

        if (this.settings.incompleteTaskValues.indexOf(" ") < 0) {
            this.settings.incompleteTaskValues =
                " " + this.settings.incompleteTaskValues;
        }

        const rightClickTaskMenu =
            this.settings.rightClickComplete ||
            this.settings.rightClickMark ||
            this.settings.rightClickMove ||
            this.settings.rightClickResetTask ||
            this.settings.rightClickResetAll ||
            this.settings.rightClickToggleAll;

        this.initSettings = {
            removeRegExp: this.tryCreateRemoveRegex(
                this.settings.removeExpression
            ),
            resetRegExp: this.tryCreateResetRegex(momentMatchString),
            incompleteTaskRegExp: this.tryCreateIncompleteRegex(
                this.settings.incompleteTaskValues
            ),
            rightClickTaskMenu: rightClickTaskMenu,
            registerHandlers:
                rightClickTaskMenu || this.settings.previewOnClick,
            completedTasks: completedTasks,
            completedTaskRegExp: this.tryCreateCompleteRegex(completedTasks),
        };
        console.debug(
            "TC: updated configuration %o, %o",
            this.settings,
            this.initSettings
        );
    }

    tryCreateRemoveRegex(param: string): RegExp {
        return param ? new RegExp(param, "g") : null;
    }

    private tryCreateResetRegex(param: string): RegExp {
        return param ? new RegExp(param + "( \\^[A-Za-z0-9-]+)?$") : null;
    }

    private tryCreateCompleteRegex(param: string): RegExp {
        return new RegExp(`^([\\s>]*- \\[)[${param}](\\] .*)$`);
    }

    private tryCreateIncompleteRegex(param: string): RegExp {
        return new RegExp(`^([\\s>]*- \\[)[${param}](\\] .*)$`);
    }

    private removeCheckboxFromLine(lineText: string): string {
        return lineText.replace(this.stripTask, "$1 $2");
    }

    /** _Complete_ an item: append completion text, remove configured strings */
    private completeTaskLine(lineText: string, mark = "x"): string {
        console.debug("TC: complete task with %s: %s", mark, lineText);
        let marked = lineText.replace(this.anyTaskMark, `$1${mark}$3`);
        if (this.initSettings.removeRegExp) {
            marked = marked.replace(this.initSettings.removeRegExp, "");
        }
        if (this.settings.appendDateFormat) {
            const strictLineEnding = lineText.endsWith("  ");
            let blockid = "";
            const match = this.blockRef.exec(marked);
            if (match && match[2]) {
                marked = match[1];
                blockid = match[2];
            }
            if (!marked.endsWith(" ")) {
                marked += " ";
            }
            marked += moment().format(this.settings.appendDateFormat) + blockid;
            if (strictLineEnding) {
                marked += "  ";
            }
        }
        return marked;
    }

    markAllTasksComplete(source: string, mark: string): string {
        const lines = source.split("\n");
        const result: string[] = [];

        for (const line of lines) {
            if (this.initSettings.incompleteTaskRegExp.exec(line)) {
                result.push(this.completeTaskLine(line, mark));
            } else {
                result.push(line);
            }
        }
        return result.join("\n");
    }

    markTaskInSource(
        source: string,
        mark: string,
        lines: number[] = []
    ): string {
        const split = source.split("\n");
        for (const n of lines) {
            split[n] = this.markTaskLine(split[n], mark);
        }
        return split.join("\n");
    }

    markTaskLine(lineText: string, mark: string): string {
        const taskMatch = this.anyTaskMark.exec(lineText);

        if (mark === "Backspace") {
            lineText = this.removeCheckboxFromLine(lineText);
        } else if (taskMatch) {
            const completeMark =
                this.initSettings.completedTasks.indexOf(mark) >= 0;

            if (this.isCompletedTaskLine(lineText)) {
                if (completeMark) {
                    console.log("TC: task already completed: %s", lineText);
                } else {
                    lineText = this.resetTaskLine(lineText, mark);
                }
            } else if (this.isIncompleteTaskLine(lineText)) {
                if (completeMark) {
                    lineText = this.settings.appendRemoveAllTasks
                        ? this.resetTaskLine(lineText, mark)
                        : this.completeTaskLine(lineText, mark);
                } else {
                    lineText = this.resetTaskLine(lineText, mark);
                }
            } else if (mark === " ") {
                lineText = this.resetTaskLine(lineText, mark);
            } else {
                console.log(
                    "TC: unknown mark (%s), leaving unchanged: %s",
                    mark,
                    lineText
                );
            }
        } else if (mark !== "Backspace") {
            const match = this.anyListItem.exec(lineText);
            if (match && match[2]) {
                console.debug("TC: list item, convert to a task %s", lineText);
                // convert to a task, and then mark
                lineText = this.markTaskLine(
                    `${match[1]}[ ] ${match[2]}`,
                    mark
                );
            } else {
                console.debug("TC: not a task or list item %s", lineText);
            }
        }
        return lineText;
    }

    private resetTaskLine(lineText: string, mark = " "): string {
        console.debug("TC: reset task with %s: %s", mark, lineText);
        lineText = lineText.replace(this.anyTaskMark, `$1${mark}$3`);
        const strictLineEnding = lineText.endsWith("  ");

        let blockid = "";
        const match = this.blockRef.exec(lineText);
        if (match && match[2]) {
            lineText = match[1];
            blockid = match[2];
        }
        if (this.initSettings.resetRegExp) {
            lineText = lineText.replace(this.initSettings.resetRegExp, "");
        }
        lineText = lineText.replace(/\s*$/, blockid);
        if (this.settings.appendRemoveAllTasks && mark !== " ") {
            // clear previous appended text
            lineText = this.completeTaskLine(lineText, mark);
        }
        if (strictLineEnding) {
            lineText += "  ";
        }
        return lineText;
    }

    resetAllTasks(source: string): string {
        const LOG_HEADING = this.settings.completedAreaHeader || "## Log";
        const lines = source.split("\n");

        const result: string[] = [];
        let inCompletedSection = false;
        for (const line of lines) {
            if (inCompletedSection) {
                if (line.startsWith("#") || line.trim() === "---") {
                    inCompletedSection = false;
                }
                result.push(line);
            } else if (line.trim() === LOG_HEADING) {
                inCompletedSection = true;
                result.push(line);
            } else if (this.isCompletedTaskLine(line)) {
                result.push(this.resetTaskLine(line));
            } else {
                result.push(line);
            }
        }
        return result.join("\n");
    }

    moveCompletedTasksInFile(source: string): string {
        const LOG_HEADING = this.settings.completedAreaHeader || "## Log";
        const lines = source.split("\n");

        if (source.indexOf(LOG_HEADING) < 0) {
            if (lines[lines.length - 1].trim() !== "") {
                lines.push("");
            }
            lines.push(LOG_HEADING);
        }

        const remaining = [];
        const completedSection = [];
        const newTasks = [];
        let inCompletedSection = false;
        let inTask = false;
        let inCallout = false;
        let completedItemsIndex = lines.length;

        for (let line of lines) {
            if (inCompletedSection) {
                if (line.startsWith("#") || line.trim() === "---") {
                    inCompletedSection = false;
                    remaining.push(line);
                } else {
                    completedSection.push(line);
                }
            } else if (line.trim() === LOG_HEADING) {
                inCompletedSection = true;
                completedItemsIndex = remaining.push(line);
                remaining.push("%%%COMPLETED_ITEMS_GO_HERE%%%");
            } else {
                if (this.isCompletedTaskLine(line)) {
                    if (this.settings.completedAreaRemoveCheckbox) {
                        line = this.removeCheckboxFromLine(line);
                    }
                    inTask = true;
                    inCallout = this.isCallout(line); // is task _inside_ the callout
                    newTasks.push(line);
                } else if (
                    inTask &&
                    !this.isTaskLine(line) &&
                    this.isContinuation(line, inCallout)
                ) {
                    newTasks.push(line);
                } else {
                    inTask = false;
                    inCallout = false;
                    remaining.push(line);
                }
            }
        }

        let result = remaining
            .slice(0, completedItemsIndex)
            .concat(...newTasks)
            .concat(...completedSection);
        if (completedItemsIndex < remaining.length - 1) {
            result = result.concat(remaining.slice(completedItemsIndex + 1));
        }
        return result.join("\n");
    }

    private isCompletedTaskLine(lineText: string): boolean {
        return this.initSettings.completedTaskRegExp.test(lineText);
    }

    private isIncompleteTaskLine(lineText: string): boolean {
        return this.initSettings.incompleteTaskRegExp.test(lineText);
    }

    private isTaskLine(lineText: string): boolean {
        return this.anyTaskMark.test(lineText);
    }

    private isContinuation(lineText: string, inCallout: boolean): boolean {
        if (inCallout) {
            const match = this.blockQuote.exec(lineText);
            if (match) {
                return (
                    match[1].endsWith(">") ||
                    match[1].endsWith("  ") ||
                    match[1].endsWith("\t")
                );
            }
        }
        return this.continuation.test(lineText);
    }

    private isCallout(lineText: string): boolean {
        return this.blockQuote.test(lineText);
    }
}
