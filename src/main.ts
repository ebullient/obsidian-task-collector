import { timeStamp } from 'console';
import { App, Editor, moment, MarkdownView, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface ManageCompletedTasksSettings {
    completedAreaHeader: string;
    removeExpression: string;
    appendDateFormat: string;
    incompleteTaskValues: string;
}

const DEFAULT_SETTINGS: ManageCompletedTasksSettings = {
    completedAreaHeader: '## Log',
    removeExpression: '',
    appendDateFormat: '',
    incompleteTaskValues: ''
}

interface CompiledTasksSettings {
    removeRegExp: RegExp;
    incompleteTaskRegExp: RegExp;
}

export default class ManageCompletedTasks extends Plugin {
    settings: ManageCompletedTasksSettings;
    initSettings: CompiledTasksSettings;

    async onload() {
        console.log('loading Manage Completed Tasks');
        await this.loadSettings();

        this.addSettingTab(new ManageCompletedTasksSettingsTab(this.app, this));

        this.addCommand({
            id: "manage-completed-tasks-mark-done",
            name: "Mark item complete",
            icon: "check-small",
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.completeTaskOnCurrentLine(editor);
            }
        });

        this.addCommand({
            id: "manage-completed-tasks-move-completed-tasks",
            name: "Move completed tasks to configured heading",
            icon: "check-in-circle",
            editorCallback: async (editor: Editor, view: MarkdownView) => {
                this.moveCompletedTasksInFile(editor);
            },
        });
    }

    onunload() {
        console.log('unloading Manage Completed Tasks');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        this.initSettings = {
            removeRegExp: this.tryCreateRemoveRegex(this.settings.removeExpression),
            incompleteTaskRegExp: this.tryCreateIncompleteRegex(this.settings.incompleteTaskValues)
        }
        console.log('loaded Manage Completed Tasks settings: %o, %o', this.settings, this.initSettings);
    }

    async saveSettings() {
        // finish initialization of config
        await this.saveData(this.settings);
        this.initSettings = {
            removeRegExp: this.tryCreateRemoveRegex(this.settings.removeExpression),
            incompleteTaskRegExp: this.tryCreateIncompleteRegex(this.settings.incompleteTaskValues)
        }
        console.log('updated Manage Completed Tasks settings: %o, %o', this.settings, this.initSettings);
    }

    tryCreateRemoveRegex(param: string): RegExp {
        return param ? new RegExp(param, 'g') : null;
    }

    tryCreateIncompleteRegex(param: string): RegExp {
        return param ? new RegExp(`^(\\s*- \\[)[${param}](\\] .*)$`)
            : new RegExp(`^(\\s*- \\[) (\\] .*)$`);
    }

    completeTaskOnCurrentLine(editor: Editor): void {
        var anchor = editor.getCursor("from");
        var lineText = editor.getLine(anchor.line);

        // Does this line indicate an incomplete task?
        var incompleteTask = this.initSettings.incompleteTaskRegExp.exec(lineText);
        if ( incompleteTask ) {
            console.log("Matching %o, found %o", lineText, incompleteTask);
            let completed = lineText.replace(this.initSettings.incompleteTaskRegExp, '$1x$2');

            if (this.initSettings.removeRegExp) {
                // If there is text to remove, remove it
                completed = completed.replace(this.initSettings.removeRegExp, '');
            }

            if (this.settings.appendDateFormat) {
                // if there is text to append, append it
                if ( !completed.endsWith(' ') ) {
                    completed += ' ';
                }
                completed += moment().format(this.settings.appendDateFormat);
            }

            // Replace line
            editor.setLine(anchor.line, completed);
        }
    }

    async moveCompletedTasksInFile(editor: Editor) {
        const HEADER = this.settings.completedAreaHeader || '## Log';
        const source = editor.getValue();
        const lines = source.split("\n");

        if ( !source.contains(HEADER) ) {
            if ( lines[lines.length - 1].trim() !== '' ) {
                lines.push('');
            }
            lines.push(HEADER);
        }

        const remaining = [];
        const completedSection = [];
        const newTasks = [];
        let inCompletedSection = false;
        let inTask = false;
        let completedItemsIndex = lines.length;

        for (const line of lines) {
            if ( inCompletedSection ) {
                if ( line.startsWith("#") || line.trim() === '---' ) {
                    inCompletedSection = false;
                    remaining.push(line);
                } else {
                    completedSection.push(line);
                }
            } else {
                const taskMatch = line.match(/^(\s*)- \[(.)\]/);
                console.log(taskMatch);
                if ( line.trim() === HEADER ) {
                    inCompletedSection = true;
                    completedItemsIndex = remaining.push(line);
                    remaining.push("%%%COMPLETED_ITEMS_GO_HERE%%%");
                } else if ( this.isCompletedTask(taskMatch) ) {
                    inTask = true;
                    newTasks.push(line);
                } else if ( inTask && !taskMatch && line.match(`^( {2,}|\\t)`) ) {
                    newTasks.push(line);
                } else {
                    inTask = false;
                    remaining.push(line);
                }
            }
        }
        console.log("Source lines: %o; Completed item index: %o; Completed section: %o; New tasks: %o",
            remaining, completedItemsIndex, completedSection, newTasks);

        let result = remaining.slice(0, completedItemsIndex).concat(...newTasks).concat(...completedSection);
        if ( completedItemsIndex < remaining.length - 1 ) {
            result = result.concat(remaining.slice(completedItemsIndex +1));
        }
        console.log("Result: %o", result);
        editor.setValue(result.join("\n"));
    }

    isCompletedTask(taskMatch: RegExpMatchArray): boolean {
        if ( taskMatch ) {
            return taskMatch[2] === 'x' || taskMatch[2] === 'X';
        }
        return false;
    }
}

class ManageCompletedTasksSettingsTab extends PluginSettingTab {
    plugin: ManageCompletedTasks;

    constructor(app: App, plugin: ManageCompletedTasks) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        let { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName("Append date to completed task")
            .setDesc("If non-empty, append today's date in the given moment.js string format to the end of the task.")
            .addMomentFormat((momentFormat) => momentFormat
                .setPlaceholder("[(]YYYY-MM-DD[)]")
                .setValue(this.plugin.settings.appendDateFormat)
                .onChange(async (value) => {
                    // Make sure date format string is valid
                    try {
                        moment().format(value);
                        this.plugin.settings.appendDateFormat = value;
                        await this.plugin.saveSettings();
                    } catch (e) {
                        console.log(`Error parsing specified date format: ${value}`);
                    }
                })
            );

        new Setting(containerEl)
            .setName("Remove text in completed task")
            .setDesc("Text matching this regular expression should be removed from the completed item. Be careful! Test your expression separately. The global flag, 'g' is used for a per-line match.")
            .addText((text) => text
                .setPlaceholder(" #(todo|task)")
                .setValue(this.plugin.settings.removeExpression)
                .onChange(async (value) => {
                    try {
                        // try compiling the regular expression
                        this.plugin.tryCreateRemoveRegex(value);
                        this.plugin.settings.removeExpression = value;
                        await this.plugin.saveSettings();
                    } catch (e) {
                        console.log(`Error parsing regular expression for text replacement: ${value}`);
                    }
                })
            );

        new Setting(containerEl)
            .setName("Incomplete task data")
            .setDesc("Specify the set of characters (usually a space) that mark incomplete tasks.")
            .addText((text) => text
                .setPlaceholder("> !?")
                .setValue(this.plugin.settings.incompleteTaskValues)
                .onChange(async (value) => {
                    this.plugin.settings.incompleteTaskValues = value;
                    await this.plugin.saveSettings();
                })
            );


        new Setting(containerEl)
            .setName("Completed area header")
            .setDesc(`Completed items will be inserted under the specified header (most recent at the top). When scanning the document for completed tasks, the contents from this configured header to the next heading or separator (---) will be ignored. This heading will be created if it does not exist. default='${DEFAULT_SETTINGS.completedAreaHeader}'`)
            .addText((text) => text
                .setPlaceholder("## Log")
                .setValue(this.plugin.settings.completedAreaHeader)
                .onChange(async (value) => {
                    this.plugin.settings.completedAreaHeader = value.trim();
                    await this.plugin.saveSettings();
                })
            );


    }
}
