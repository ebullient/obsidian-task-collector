import { App, moment, PluginSettingTab, Setting } from 'obsidian';
import { TaskCollectorSettings, DEFAULT_SETTINGS } from './taskcollector-Settings';
import { TaskCollector } from './taskcollector-TaskCollector';
import TaskCollectorPlugin from "./main";


export class TaskCollectorSettingsTab extends PluginSettingTab {
    plugin: TaskCollectorPlugin;
    taskCollector: TaskCollector;

    constructor(app: App, plugin: TaskCollectorPlugin, taskCollector: TaskCollector) {
        super(app, plugin);
        this.plugin = plugin;
        this.taskCollector = taskCollector;
    }

    display(): void {
        this.containerEl.empty();

        this.containerEl.createEl("h1", { text: "Task Collector" });

        const tempSettings: TaskCollectorSettings = Object.assign(this.taskCollector.settings);

        new Setting(this.containerEl)
            .setName("Support canceled tasks")
            .setDesc("Use a - to indicate canceled tasks. Canceled tasks are processed in the same way as completed tasks using options below.")
            .addToggle(toggle => toggle
                .setValue(tempSettings.supportCanceledTasks)
                .onChange(async value => {
                    tempSettings.supportCanceledTasks = value;
                    this.taskCollector.updateSettings(tempSettings);
                    await this.plugin.saveSettings();
                }));

        this.containerEl.createEl("h2", { text: "Completing tasks" });

        new Setting(this.containerEl)
            .setName("Append date to completed task")
            .setDesc("If non-empty, append today's date in the given moment.js string format to the end of the task text.")
            .addMomentFormat((momentFormat) => momentFormat
                .setPlaceholder("YYYY-MM-DD")
                .setValue(tempSettings.appendDateFormat)
                .onChange(async (value) => {
                    try {
                        // Try formatting "now" with the specified format string
                        moment().format(value);
                        tempSettings.appendDateFormat = value;
                        this.taskCollector.updateSettings(tempSettings);
                        await this.plugin.saveSettings();
                    } catch (e) {
                        console.log(`Error parsing specified date format: ${value}`);
                    }
                })
            );

        new Setting(this.containerEl)
            .setName("Remove text in completed task")
            .setDesc("Text matching this regular expression should be removed from the task text. Be careful! Test your expression separately. The global flag, 'g' is used for a per-line match.")
            .addText((text) => text
                .setPlaceholder(" #(todo|task)")
                .setValue(tempSettings.removeExpression)
                .onChange(async (value) => {
                    try {
                        // try compiling the regular expression
                        this.taskCollector.tryCreateRemoveRegex(value);

                        tempSettings.removeExpression = value;
                        this.taskCollector.updateSettings(tempSettings);
                        await this.plugin.saveSettings();
                    } catch (e) {
                        console.log(`Error parsing regular expression for text replacement: ${value}`);
                    }
                })
            );

        new Setting(this.containerEl)
            .setName("Incomplete task indicators")
            .setDesc("Specify the set of single characters (a space by default) that indicate incomplete tasks.")
            .addText((text) => text
                .setPlaceholder("> !?")
                .setValue(tempSettings.incompleteTaskValues)
                .onChange(async (value) => {
                    if ( value.contains('x') || value.contains('X') ) {
                        console.log(`Set of characters should not contain the marker for completed tasks: ${value}`);
                    } else if ( tempSettings.supportCanceledTasks && value.contains('-')) {
                        console.log(`Set of characters should not contain the marker for canceled tasks: ${value}`);
                    } else {
                        if (!value.contains(' ')) { // make sure space is included
                            value = ' ' + value;
                        }
                        tempSettings.incompleteTaskValues = value;
                        this.taskCollector.updateSettings(tempSettings);
                        await this.plugin.saveSettings();
                    }
                })
            );

        this.containerEl.createEl("h2", { text: "Moving completed tasks" });

        new Setting(this.containerEl)
            .setName("Completed area header")
            .setDesc(`Completed (or canceled) items will be inserted under the specified header (most recent at the top). When scanning the document for completed/canceled tasks, the contents from this configured header to the next heading or separator (---) will be ignored. This heading will be created if the command is invoked and the heading does not exist. The default heading is '${DEFAULT_SETTINGS.completedAreaHeader}'.`)
            .addText((text) => text
                .setPlaceholder("## Log")
                .setValue(tempSettings.completedAreaHeader)
                .onChange(async (value) => {
                    tempSettings.completedAreaHeader = value.trim();
                    this.taskCollector.updateSettings(tempSettings);
                    await this.plugin.saveSettings();
                })
            );

        new Setting(this.containerEl)
            .setName("Remove the checkbox from moved items")
            .setDesc(`Remove the checkbox from completed (or canceled) tasks during the move to the completed area. This transforms tasks into normal list items. Task Collector will not be able to reset these items. They also will not appear in task searches or queries. The default value is: '${DEFAULT_SETTINGS.completedAreaRemoveCheckbox}'.`)
            .addToggle(toggle => toggle
                .setValue(tempSettings.completedAreaRemoveCheckbox)
                .onChange(async value => {
                    tempSettings.completedAreaRemoveCheckbox = value;
                    this.taskCollector.updateSettings(tempSettings);
                    await this.plugin.saveSettings();
                }));

        this.containerEl.createEl("h2", { text: "Right-click Menu items" });

        this.containerEl.createEl("p", { text: "Task Collector creates commands that can be bound to hotkeys or accessed using slash commands for marking tasks complete (or canceled) and resetting tasks to an incomplete state. The following settings add right click context menu items for those commands." });

        new Setting(this.containerEl)
            .setName("Add menu item for marking a task")
            .setDesc("Add an item to the right-click menu in edit mode to mark the task _on the current line (or within the current selection)_. This menu item will trigger a quick pop-up modal to select the desired mark value. The selected value will determine follow-on actions: complete, cancel, or reset.")
            .addToggle(toggle => toggle
                .setValue(tempSettings.rightClickMark)
                .onChange(async value => {
                    tempSettings.rightClickMark = value;
                    this.taskCollector.updateSettings(tempSettings);
                    await this.plugin.saveSettings();
                }));

        new Setting(this.containerEl)
            .setName("Add menu item for completing a task")
            .setDesc("Add an item to the right-click menu in edit mode to mark the task _on the current line (or within the current selection)_ complete. If canceled items are supported, an additional menu item will be added to mark selected tasks as canceled.")
            .addToggle(toggle => toggle
                .setValue(tempSettings.rightClickComplete)
                .onChange(async value => {
                    tempSettings.rightClickComplete = value;
                    this.taskCollector.updateSettings(tempSettings);
                    await this.plugin.saveSettings();
                }));

        new Setting(this.containerEl)
            .setName("Add menu item for resetting a task")
            .setDesc("Add an item to the right-click menu in edit mode to reset the task _on the current line (or within the current selection)_.")
            .addToggle(toggle => toggle
                .setValue(tempSettings.rightClickResetTask)
                .onChange(async value => {
                    tempSettings.rightClickResetTask = value;
                    this.taskCollector.updateSettings(tempSettings);
                    await this.plugin.saveSettings();
                }));

        new Setting(this.containerEl)
            .setName("Add menu items for completing all tasks")
            .setDesc("Add an item to the right-click menu in edit mode to mark _all_ incomplete tasks in the current document complete.")
            .addToggle(toggle => toggle
                .setValue(tempSettings.rightClickToggleAll)
                .onChange(async value => {
                    tempSettings.rightClickToggleAll = value;
                    this.taskCollector.updateSettings(tempSettings);
                    await this.plugin.saveSettings();
                }));

        new Setting(this.containerEl)
                .setName("Add menu item for resetting all tasks")
                .setDesc("Add an item to the right-click menu to reset _all_ completed (or canceled) tasks.")
                .addToggle(toggle => toggle
                    .setValue(tempSettings.rightClickResetAll)
                    .onChange(async value => {
                        tempSettings.rightClickResetAll = value;
                        this.taskCollector.updateSettings(tempSettings);
                        await this.plugin.saveSettings();
                    }));

        new Setting(this.containerEl)
            .setName("Add menu item for moving all completed tasks")
            .setDesc("Add an item to the right-click menu to move _all_ completed (or canceled) tasks.")
            .addToggle(toggle => toggle
                .setValue(tempSettings.rightClickMove)
                .onChange(async value => {
                    tempSettings.rightClickMove = value;
                    this.taskCollector.updateSettings(tempSettings);
                    await this.plugin.saveSettings();
                }));
    }
}
