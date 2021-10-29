import { App, Editor, moment } from 'obsidian';
import { TaskCollectorSettings, CompiledTasksSettings } from './taskcollector-Settings';

export class TaskCollector {
    settings: TaskCollectorSettings;
    initSettings: CompiledTasksSettings;
    completedOrCanceled: RegExp;

    constructor(private app: App) {
        this.completedOrCanceled = new RegExp(/^(\s*- \[)[xX-](\] .*)$/);
    }

    updateSettings(settings: TaskCollectorSettings): void {
        this.settings = settings;
        let momentMatchString = null;

        if (settings.appendDateFormat) {
            // YYYY-MM-DD or DD MM, YYYY or .. [(]YYYY-MM-DD[)] where the stuff in the brackets is literal
            const literals = [];
            let foundLiteral = false;
            let literal = '';

            momentMatchString = '';
            for (const c of settings.appendDateFormat) {
                if (c == '[') {
                    foundLiteral = true;
                } else if (foundLiteral) {
                    if (c == ']') {
                        const i = literals.push(literal);
                        literal = '';
                        momentMatchString += `%$${i - 1}$%`;
                        foundLiteral = false;
                    } else {
                        literal += c;
                    }
                } else {
                    momentMatchString += c;
                }
            }

            // Now let's replace moment date formatting
            momentMatchString = momentMatchString
                .replace('YYYY', '\\d{4}')     // 4-digit year
                .replace('YY', '\\d{2}')       // 2-digit year
                .replace('DD', '\\d{2}')       // day of month, padded
                .replace('D', '\\d{1,2}')      // day of month, not padded
                .replace('MMM', '[A-Za-z]{3}') // month, abbrv
                .replace('MM', '\\d{2}')       // month, padded
                .replace('M', '\\d{1,2}')      // month, not padded
                .replace('HH', '\\d{2}')       // 24-hour, padded
                .replace('H', '\\d{1,2}')      // 24-hour, not padded
                .replace('hh', '\\d{2}')       // 12-hour, padded
                .replace('h', '\\d{1,2}')      // 12-hour, not padded
                .replace('mm', '\\d{2}')       // minute, padded
                .replace('m', '\\d{1,2}')      // minute, not padded

            if (literals.length > 0) {
                for (let i = 0; i < literals.length; i++) {
                    momentMatchString = momentMatchString.replace(`%$${i}$%`, literals[i]);
                }
            }

            // final fixes to convert to regex
            momentMatchString = momentMatchString
                .replace(/\(/, '\\(')    // escape a naked (
                .replace(/\)/, '\\)')    // escape a naked )
        }

        const rightClickTaskMenu = (this.settings.rightClickComplete || this.settings.rightClickMove);
        this.initSettings = {
            removeRegExp: this.tryCreateRemoveRegex(this.settings.removeExpression),
            resetRegExp: this.tryCreateResetRegex(momentMatchString),
            incompleteTaskRegExp: this.tryCreateIncompleteRegex(this.settings.incompleteTaskValues),
            rightClickTaskMenu: rightClickTaskMenu
        }
        console.log('loaded TC settings: %o, %o', this.settings, this.initSettings);
    }

    tryCreateRemoveRegex(param: string): RegExp {
        return param ? new RegExp(param, 'g') : null;
    }

    tryCreateResetRegex(param: string): RegExp {
        return param ? new RegExp(param + '$') : null;
    }

    tryCreateIncompleteRegex(param: string): RegExp {
        return param ? new RegExp(`^(\\s*- \\[)[${param}](\\] .*)$`)
            : new RegExp(/^(\s*- \[) (\] .*)$/);
    }

    updateTaskLine(lineText: string, mark: string): string {
        let marked = lineText.replace(this.initSettings.incompleteTaskRegExp, '$1' + mark + '$2');
        if (this.initSettings.removeRegExp) {
            // If there is text to remove, remove it
            marked = marked.replace(this.initSettings.removeRegExp, '');
        }
        if (this.settings.appendDateFormat) {
            // if there is text to append, append it
            if (!marked.endsWith(' ')) {
                marked += ' ';
            }
            marked += moment().format(this.settings.appendDateFormat);
        }
        return marked;
    }

    markTaskOnLine(editor: Editor, mark: string, i: number): void {
        const lineText = editor.getLine(i);

        // Does this line indicate an incomplete task?
        const incompleteTask = this.initSettings.incompleteTaskRegExp.exec(lineText);
        if (incompleteTask) {
            const marked = this.updateTaskLine(lineText, mark);
            editor.setLine(i, marked);
        }
    }

    markTaskOnCurrentLine(editor: Editor, mark: string): void {
        if (editor.somethingSelected()) {
            const cursorStart = editor.getCursor("from")
            const cursorEnd = editor.getCursor("to");
            for (let i = cursorStart.line; i <= cursorEnd.line; i++) {
                this.markTaskOnLine(editor, mark, i);
            }
            editor.setSelection(cursorStart, {
                line: cursorEnd.line,
                ch: editor.getLine(cursorEnd.line).length
            });
        } else {
            const anchor = editor.getCursor("from");
            this.markTaskOnLine(editor, mark, anchor.line);
        }
    }

    markAllTasks(editor: Editor, mark: string): void {
        const source = editor.getValue();
        const lines = source.split("\n");
        const result: string[] = [];

        for (const line of lines) {
            if (this.initSettings.incompleteTaskRegExp.exec(line)) {
                result.push(this.updateTaskLine(line, mark));
            } else {
                result.push(line);
            }
        }
        editor.setValue(result.join("\n"));
    }

    resetTaskLine(lineText: string): string {
        let marked = lineText.replace(this.completedOrCanceled, '$1 $2');
        if (this.initSettings.resetRegExp) {
            marked = marked.replace(this.initSettings.resetRegExp, '');
        }
        return marked;
    }

    resetTaskOnLine(editor: Editor, i: number): void {
        const lineText = editor.getLine(i);

        // Does this line indicate an incomplete task?
        if (this.completedOrCanceled.exec(lineText)) {
            const marked = this.resetTaskLine(lineText);
            editor.setLine(i, marked);
        }
    }

    resetTaskOnCurrentLine(editor: Editor): void {
        if (editor.somethingSelected()) {
            const cursorStart = editor.getCursor("from")
            const cursorEnd = editor.getCursor("to");
            for (let i = cursorStart.line; i <= cursorEnd.line; i++) {
                this.resetTaskOnLine(editor, i);
            }
            editor.setSelection(cursorStart, {
                line: cursorEnd.line,
                ch: editor.getLine(cursorEnd.line).length
            });
        } else {
            const anchor = editor.getCursor("from");
            this.resetTaskOnLine(editor, anchor.line);
        }
    }

    resetAllTasks(editor: Editor): void {
        const LOG_HEADING = this.settings.completedAreaHeader || '## Log';
        const source = editor.getValue();
        const lines = source.split("\n");

        const result: string[] = [];
        let inCompletedSection = false;
        for (const line of lines) {
            if (inCompletedSection) {
                if (line.startsWith("#") || line.trim() === '---') {
                    inCompletedSection = false;
                }
                result.push(line);
            } else if (line.trim() === LOG_HEADING) {
                inCompletedSection = true;
                result.push(line);
            } else if (this.completedOrCanceled.exec(line)) {
                result.push(this.resetTaskLine(line));
            } else {
                result.push(line);
            }
        }
        editor.setValue(result.join("\n"));
    }

    moveCompletedTasksInFile(editor: Editor): void {
        const LOG_HEADING = this.settings.completedAreaHeader || '## Log';
        const source = editor.getValue();
        const lines = source.split("\n");

        if (!source.contains(LOG_HEADING)) {
            if (lines[lines.length - 1].trim() !== '') {
                lines.push('');
            }
            lines.push(LOG_HEADING);
        }

        const remaining = [];
        const completedSection = [];
        const newTasks = [];
        let inCompletedSection = false;
        let inTask = false;
        let completedItemsIndex = lines.length;

        for (const line of lines) {
            if (inCompletedSection) {
                if (line.startsWith("#") || line.trim() === '---') {
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
                const taskMatch = line.match(/^(\s*)- \[(.)\]/);
                // console.log(taskMatch);
                if (this.isCompletedTask(taskMatch)) {
                    inTask = true;
                    newTasks.push(line);
                } else if (inTask && !taskMatch && line.match(/^( {2,}|\\t)/)) {
                    newTasks.push(line);
                } else {
                    inTask = false;
                    remaining.push(line);
                }
            }
        }
        // console.log("Source lines: %o; Completed item index: %o; Completed section: %o; New tasks: %o",
        //     remaining, completedItemsIndex, completedSection, newTasks);

        let result = remaining.slice(0, completedItemsIndex).concat(...newTasks).concat(...completedSection);
        if (completedItemsIndex < remaining.length - 1) {
            result = result.concat(remaining.slice(completedItemsIndex + 1));
        }
        editor.setValue(result.join("\n"));
    }

    isCompletedTask(taskMatch: RegExpMatchArray): boolean {
        if (taskMatch) {
            return taskMatch[2] === 'x' || taskMatch[2] === 'X'
                || (this.settings.supportCanceledTasks && taskMatch[2] == '-');
        }
        return false;
    }
}
