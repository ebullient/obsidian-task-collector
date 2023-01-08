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
            momentMatchString = settings.appendDateFormat;

            const onlyFormattingTokens = /^(Y|D|M|H|h|m)+$/;
            const formattingTokens =
                /(\[[^[]*\])|(\\)?([Hh]mm(ss)?|Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Qo?|N{1,5}|YYYYYY|YYYYY|YYYY|YY|y{2,4}|yo?|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|kk?|mm?|ss?|S{1,9}|x|X|zz?|ZZ?|.)/g;

            const array = momentMatchString.match(formattingTokens);
            for (let i = 0, length = array.length; i < length; i++) {
                const segment = array[i];
                if (onlyFormattingTokens.test(segment)) {
                    array[i] = segment
                        .replace(/YYYY/g, "\\d{4}") // 4-digit year
                        .replace(/YY/g, "\\d{2}") // 2-digit year
                        .replace(/DD/g, "\\d{2}") // day of month, padded
                        .replace(/D/g, "\\d{1,2}") // day of month, not padded
                        .replace(/MMM/g, "[A-Za-z]{3}") // month, abbrv
                        .replace(/MM/g, "\\d{2}") // month, padded
                        .replace(/M/g, "\\d{1,2}") // month, not padded
                        .replace(/HH/g, "\\d{2}") // 24-hour, padded
                        .replace(/H/g, "\\d{1,2}") // 24-hour, not padded
                        .replace(/hh/g, "\\d{2}") // 12-hour, padded
                        .replace(/h/g, "\\d{1,2}") // 12-hour, not padded
                        .replace(/mm/g, "\\d{2}") // minute, padded
                        .replace(/m/g, "\\d{1,2}"); // minute, not padded;
                } else if (segment.match(/\[[\s\S]/)) {
                    array[i] = this.replaceLiterals(
                        segment.replace(/^\[|\]$/g, "")
                    );
                } else {
                    array[i] = this.replaceLiterals(segment);
                }
            }

            momentMatchString = array.join("");
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

    private replaceLiterals(segment: string) {
        return segment
            .replace(/\(/g, "\\(") // escape literal (
            .replace(/\)/g, "\\)") // escape literal )
            .replace(/\[/g, "\\[") // escape literal [
            .replace(/\]/g, "\\]"); // escape literal ]
    }
}
