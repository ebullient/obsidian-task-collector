import { moment } from "obsidian";
import {
    TaskCollectorSettings,
    TaskCollectorCache,
    ManipulationSettings,
    TcSection,
} from "./@types/settings";
import {
    CACHE_DEFAULT,
    TEXT_ONLY_NAME,
    TEXT_ONLY_MARK,
    DEFAULT_NAME,
} from "./taskcollector-Constants";
import { Data } from "./taskcollector-Data";

const DATE_FORMATTING_TOKENS = /^(Y|D|M|H|h|m)+$/;
const ALL_FORMATTING_TOKENS =
    /(\[[^[]*\])|(\\)?([Hh]mm(ss)?|Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Qo?|N{1,5}|YYYYYY|YYYYY|YYYY|YY|y{2,4}|yo?|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|kk?|mm?|ss?|S{1,9}|x|X|zz?|ZZ?|.)/g;

export enum Direction {
    PREV,
    NEXT,
}

export class TaskCollector {
    settings: TaskCollectorSettings;
    cache: TaskCollectorCache;

    anyListItem = new RegExp(/^([\s>]*- )([^\\[].*)$/);
    anyTaskMark = new RegExp(/^([\s>]*- \[)(.)(\] .*)$/);
    anyText = new RegExp(/^([\s>]*)(.*)$/);
    blockQuote = new RegExp(/^(\s*>[\s>]*)(.*)$/);
    blockRef = new RegExp(/^(.*?)( \^[A-Za-z0-9-]+)?$/);
    continuation = new RegExp(/^( {2,}|\t)/);
    stripTask = new RegExp(/^([\s>]*-) \[.\] (.*)$/);

    init(settings: TaskCollectorSettings): void {
        this.settings = settings;
        this.cache = JSON.parse(JSON.stringify(CACHE_DEFAULT));

        this.cache.useContextMenu =
            settings.contextMenu.markTask || settings.contextMenu.resetTask;

        Object.values(settings.groups).forEach((v) =>
            this.cacheTaskSettings(v, this.cache)
        );

        // Store sorted unique list of completion area headings
        if (this.settings.collectionEnabled) {
            this.cache.areaHeadings = [
                ...Object.keys(this.cache.headingToMark),
            ];
            this.cache.areaHeadings.sort();
        }
        this.cache.completedMarks = Data.sanitizeMarks(
            this.cache.completedMarks
        );
        this.cache.incompleteMarks = Data.sanitizeMarks(
            this.cache.incompleteMarks
        );

        this.logDebug("configuration read", this.settings, this.cache);
    }

    logDebug(message: string, ...optionalParams: any[]): void {
        if (!this.settings || this.settings.debug) {
            console.debug("(TC) " + message, ...optionalParams);
        }
    }

    /**
     * Process task manipulation settings and populate cache
     * @param mts
     * @param cache
     */
    private cacheTaskSettings(
        mts: ManipulationSettings,
        cache: TaskCollectorCache
    ) {
        mts.marks.split("").forEach((x) => {
            if (cache.marks[x]) {
                const name = cache.marks[x].name;
                console.warn(
                    `Two groups of settings contain ${x}: ${name} and ${mts.name}. Using ${name}`
                );
            } else {
                // allow for lookup of this configuration per character
                cache.marks[x] = mts;

                // This specific configuration may want to add a context menu
                cache.useContextMenu == cache.useContextMenu ||
                    mts.useContextMenu;

                // store the regex for matching text to remove
                if (mts.removeExpr) {
                    const regex = tryRemoveTextRegex(mts.removeExpr);
                    cache.removeExpr[mts.name] = regex;
                }

                // store the undo string for this collection of marks
                if (mts.appendDateFormat) {
                    const regex = tryUndoRegex(mts.appendDateFormat);
                    cache.undoExpr[mts.name] = regex;
                }

                // store the area heading for this mark
                if (mts.collection && mts.collection.areaHeading) {
                    if (cache.headingToMark[mts.collection.areaHeading]) {
                        cache.headingToMark[mts.collection.areaHeading] += x;
                    } else {
                        cache.headingToMark[mts.collection.areaHeading] = x;
                    }
                }

                if (x !== TEXT_ONLY_MARK) {
                    if (mts.complete) {
                        cache.completedMarks += x;
                    } else {
                        cache.incompleteMarks += x;
                    }
                }
            }
        });
    }

    // Mark tasks

    /**
     * Mark selected tasks
     * @param source
     * @param direction: -1 or 1
     * @param lines
     */
    markInCycle(source: string, d: Direction, lines: number[] = []): string {
        const split = source.split("\n");
        for (const n of lines) {
            const taskMatch = this.anyTaskMark.exec(split[n]);
            const listMatch = this.anyListItem.exec(split[n]);
            if (taskMatch) {
                // already a task: change from old to new
                const old = taskMatch[2];
                const i = this.settings.markCycle.indexOf(old);
                const len = this.settings.markCycle.length;
                const next =
                    d == Direction.NEXT ? (i + 1) % len : (i + len - 1) % len;
                split[n] = this.doMarkTask(
                    split[n],
                    old,
                    this.settings.markCycle[next]
                );
            } else if (listMatch && listMatch[2]) {
                // convert to a task, and then mark
                split[n] = this.updateLineText(
                    `${listMatch[1]}[ ] ${listMatch[2]}`,
                    this.settings.markCycle[0]
                );
            }
        }
        return split.join("\n");
    }

    /**
     * Mark selected tasks
     * @param source
     * @param mark
     * @param lines
     */
    markSelectedTask(
        source: string,
        mark: string,
        lines: number[] = []
    ): string {
        const split = source.split("\n");
        for (const n of lines) {
            split[n] = this.updateLineText(split[n], mark);
        }
        return split.join("\n");
    }

    /**
     * Update the task in the provided line text to use
     * the specified mark
     * @param lineText
     * @param mark
     */
    updateLineText(lineText: string, mark: string): string {
        if (mark === "Backspace") {
            return this.doRemoveTask(lineText);
        } else if (mark === "") {
            mark = TEXT_ONLY_MARK;
        }

        if (mark === TEXT_ONLY_MARK && this.cache.marks[TEXT_ONLY_MARK]) {
            // append general text. Do not convert to or mess the task-nature
            return this.doAppendText(lineText);
        }
        const taskMatch = this.anyTaskMark.exec(lineText);
        if (taskMatch) {
            // already a task: change from old to new
            const old = taskMatch[2];
            return this.doMarkTask(lineText, old, mark);
        }
        const listMatch = this.anyListItem.exec(lineText);
        if (listMatch && listMatch[2]) {
            // convert to a task, and then mark (recurse)
            return this.updateLineText(
                `${listMatch[1]}[ ] ${listMatch[2]}`,
                mark
            );
        }
        if (lineText && this.settings.convertEmptyLines) {
            const indentMatch = this.anyText.exec(lineText);
            // split line on first character
            return this.updateLineText(
                `${indentMatch[1]}- [ ] ${indentMatch[2]}`,
                mark
            );
        }

        this.logDebug("not a task or list item %s", lineText);
        return lineText;
    }

    private doAppendText(lineText: string, append = true): string {
        // remember line ending: block id and strict line ending whitespace
        let blockid = "";
        const strictLineEnding = lineText.endsWith("  ");
        const match = this.blockRef.exec(lineText);
        if (match && match[2]) {
            lineText = match[1];
            blockid = match[2];
        }

        // Apply text-only configuration
        const undoExpr = this.cache.undoExpr[TEXT_ONLY_NAME];
        if (undoExpr) {
            lineText = lineText.replace(undoExpr, "");
        }
        if (append) {
            const removeExpr = this.cache.removeExpr[TEXT_ONLY_NAME];
            if (removeExpr) {
                lineText = lineText.replace(removeExpr, "");
            }
            const appendExpr =
                this.settings.groups[TEXT_ONLY_NAME].appendDateFormat;
            if (appendExpr) {
                if (!lineText.endsWith(" ")) {
                    lineText += " ";
                }
                lineText += moment().format(appendExpr);
            }
        }

        // restore block id & trailing whitespace
        lineText = lineText.replace(/\s*$/, blockid);
        if (strictLineEnding) {
            lineText += "  ";
        }
        this.logDebug("text updated", lineText);
        return lineText;
    }

    private doMarkTask(lineText: string, old: string, mark: string): string {
        this.logDebug("mark task", lineText);
        const oldMarkName = this.cache.marks[old]?.name || DEFAULT_NAME;
        const newMarkName = this.cache.marks[mark]?.name || DEFAULT_NAME;

        // replace the task mark
        lineText = lineText.replace(this.anyTaskMark, `$1${mark}$3`);

        // remember line ending: block id and strict line ending whitespace
        let blockid = "";
        const strictLineEnding = lineText.endsWith("  ");
        const match = this.blockRef.exec(lineText);
        if (match && match[2]) {
            lineText = match[1];
            blockid = match[2];
        }

        const undoExpr = this.cache.undoExpr[oldMarkName];
        if (undoExpr) {
            lineText = lineText.replace(undoExpr, "");
        }

        const removeExpr = this.cache.removeExpr[newMarkName];
        if (removeExpr) {
            lineText = lineText.replace(removeExpr, "");
        }

        const appendExpr = this.settings.groups[newMarkName].appendDateFormat;
        if (appendExpr) {
            if (!lineText.endsWith(" ")) {
                lineText += " ";
            }
            lineText += moment().format(appendExpr);
        }

        // append block id & replace ending whitespace
        lineText = lineText.replace(/\s*$/, blockid);
        if (strictLineEnding) {
            lineText += "  ";
        }
        this.logDebug("task marked", lineText);
        return lineText;
    }

    private doRemoveTask(lineText: string): string {
        return lineText.replace(this.stripTask, "$1 $2");
    }

    // Task Collection / Move tasks

    /**
     * Move marked task to the appropriate heading
     * @param source
     */
    moveAllTasks(source: string): string {
        if (this.cache.areaHeadings.length == 0) {
            return source;
        }

        const parsed: string[] = [];
        const headersInOrder: string[] = [];

        // split out content for named sections
        const sections = this.scan(source, parsed, headersInOrder);

        // move general tasks to appropriate sections
        const result = this.move(parsed, sections, headersInOrder, 0);

        // in order of appearance from top to bottom
        for (let i = 0; i < headersInOrder.length; i++) {
            const [heading, bi] = headersInOrder[i].split("%:%");
            const bi2 = Number(bi);

            // move existing tasks in sections to other sections
            sections[heading].blocks[bi2].existing = this.move(
                sections[heading].blocks[bi2].existing,
                sections,
                headersInOrder,
                i,
                this.cache.headingToMark[heading]
            );
        }

        return result
            .flatMap((l) => {
                const match = l.match(/%%--TC--(.*)--(\d+)--%%/);
                if (match) {
                    const h = match[1];
                    const i = Number(match[2]);
                    return sections[h].blocks[i].newTasks.concat(
                        ...sections[h].blocks[i].existing
                    );
                }
                return l;
            })
            .join("\n");
    }

    private scan(
        source: string,
        parsed: string[],
        headersInOrder: string[]
    ): Record<string, TcSection> {
        const split = source.split("\n");
        this.ensureHeadings(split);

        const sections: Record<string, TcSection> = {};
        let activeSection: string[] = null;

        // parse / analyze
        for (const line of split) {
            const trimmed = line.trim();

            if (
                line.startsWith("#") &&
                contains(this.cache.areaHeadings, trimmed)
            ) {
                parsed.push(line); // push heading to parsed lines
                const index = this.createCompletionArea(trimmed, sections);

                activeSection = sections[trimmed].blocks[index].existing;
                parsed.push(`%%--TC--${trimmed}--${index}--%%`);
                headersInOrder.push(`${trimmed}%:%${index}`);
            } else if (
                activeSection &&
                (line.startsWith("#") || line.trim() === "---")
            ) {
                activeSection = null;
                parsed.push(line);
            } else if (activeSection) {
                activeSection.push(line);
            } else {
                parsed.push(line);
            }
        }
        return sections;
    }

    private move(
        source: string[],
        sections: Record<string, TcSection>,
        order: string[],
        orderIndex: number,
        excluded?: string
    ): string[] {
        const remaining: string[] = [];

        let markToMove = null;
        let taskToBeMoved = null;
        let inCallout = false;

        for (let line of source) {
            if (taskToBeMoved && this.isContinuation(line, inCallout)) {
                // keep task lines together
                taskToBeMoved.push(line);
                continue;
            }
            if (taskToBeMoved) {
                const heading =
                    this.cache.marks[markToMove].collection.areaHeading;
                const index = this.findNextSection(heading, order, orderIndex);

                // add this task to the list of new tasks for the section
                taskToBeMoved.forEach((l) =>
                    sections[heading].blocks[index].newTasks.push(l)
                );

                markToMove = null;
                taskToBeMoved = null;
                inCallout = false;
            }
            if (line.startsWith("%%--TC--")) {
                // only applies to general text, not completion sections
                // always preceded by a section heading
                orderIndex = indexFromLine(line);
                remaining.push(line);
                continue;
            }

            const taskMatch = this.anyTaskMark.exec(line);
            if (taskMatch) {
                const mark = taskMatch[2];
                if (excluded && excluded.indexOf(mark) >= 0) {
                    // we are in the target section for this mark
                    remaining.push(line);
                } else if (this.isCollected(mark)) {
                    // start of task that should be moved to another section
                    if (this.removeCheckbox(mark)) {
                        line = this.doRemoveTask(line);
                    }
                    markToMove = mark;
                    taskToBeMoved = [];
                    taskToBeMoved.push(line);
                    inCallout = this.isCallout(line); // is the task inside a callout
                } else {
                    // mark not configured for collection
                    remaining.push(line);
                }
            } else {
                remaining.push(line);
            }
        }
        return remaining;
    }

    /**
     * Find _next_ heading of the requested type (looping back to the beginning if necessary)
     * @param heading
     * @param order
     * @param start
     * @returns
     */
    private findNextSection(
        heading: string,
        order: string[],
        start: number
    ): number {
        let wrap = false;
        for (let i = start; !wrap || i != start; i++) {
            if (i == order.length) {
                i = 0;
                wrap = true;
            }
            if (order[i].startsWith(heading)) {
                const [_, index] = order[i].split("%:%");
                return Number(index);
            }
        }
        return undefined;
    }

    private createCompletionArea(
        name: string,
        sections: Record<string, TcSection>
    ): number {
        if (!sections[name]) {
            sections[name] = {
                blocks: [],
            };
        }
        sections[name].blocks.push({
            existing: [],
            newTasks: [],
        });
        return sections[name].blocks.length - 1;
    }

    private ensureHeadings(split: string[]) {
        this.cache.areaHeadings.forEach((h) => {
            if (!contains(split, h)) {
                if (split[split.length - 1].trim() !== "") {
                    split.push("");
                }
                split.push(h);
                split.push("");
            }
        });
    }

    private isCollected(mark: string) {
        return (
            this.cache.marks[mark] &&
            this.cache.marks[mark].collection &&
            this.cache.marks[mark].collection.areaHeading
        );
    }

    private removeCheckbox(mark: string) {
        return (
            this.cache.marks[mark] &&
            this.cache.marks[mark].collection &&
            this.cache.marks[mark].collection.removeCheckbox
        );
    }

    private isCallout(lineText: string): boolean {
        return this.blockQuote.test(lineText);
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
}

function contains(haystack: string[], needle: string) {
    return haystack.find((s) => s === needle);
}

function indexFromLine(lineText: string): number {
    const match = lineText.match(/%%--TC--(.*)--(\d+)--%%/);
    if (match) {
        return Number(match[2]);
    }
    return undefined;
}

export const _regex = {
    tryCompleteRegex,
    tryIncompleteRegex,
    tryUndoRegex,
    tryRemoveTextRegex,
};

function tryCompleteRegex(param: string): RegExp {
    return new RegExp(`^([\\s>]*- \\[)[${param}](\\] .*)$`);
}

function tryIncompleteRegex(param: string): RegExp {
    return new RegExp(`^([\\s>]*- \\[)[${param}](\\] .*)$`);
}

function tryRemoveTextRegex(param: string): RegExp {
    return param ? new RegExp(param, "g") : null;
}

function tryUndoRegex(appendDateFormat: string): RegExp {
    const array = appendDateFormat.match(ALL_FORMATTING_TOKENS);
    for (let i = 0, length = array.length; i < length; i++) {
        const segment = array[i];
        if (DATE_FORMATTING_TOKENS.test(segment)) {
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
            array[i] = replaceLiterals(segment.replace(/^\[|\]$/g, ""));
        } else {
            array[i] = replaceLiterals(segment);
        }
    }

    // allow whitespace around the appended string
    const matchString = `\\s*${array.join("")}\\s*`;

    // allow a block reference at the end of the line
    return new RegExp(matchString + "( \\^[A-Za-z0-9-]+)?$");
}

function replaceLiterals(segment: string) {
    return segment
        .replace(/\(/g, "\\(") // escape literal (
        .replace(/\)/g, "\\)") // escape literal )
        .replace(/\[/g, "\\[") // escape literal [
        .replace(/\]/g, "\\]"); // escape literal ]
}
