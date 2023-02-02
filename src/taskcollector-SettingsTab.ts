import {
    App,
    moment,
    ButtonComponent,
    PluginSettingTab,
    Setting,
    Notice,
    debounce,
} from "obsidian";
import { TaskCollector, _regex } from "./taskcollector-TaskCollector";
import TaskCollectorPlugin from "./main";
import { ManipulationSettings, TaskCollectorSettings } from "./@types/settings";
import {
    COMPLETE_NAME,
    DEFAULT_COLLECTION,
    DEFAULT_NAME,
    TEXT_ONLY_MARK,
    TEXT_ONLY_NAME,
} from "./taskcollector-Constants";
import { Data } from "./taskcollector-Data";

export class TaskCollectorSettingsTab extends PluginSettingTab {
    plugin: TaskCollectorPlugin;
    tc: TaskCollector;
    newSettings: TaskCollectorSettings;
    groupList: HTMLDListElement;
    markInputCache: Record<string, Set<HTMLInputElement>> = {};
    otherInputCache: Record<string, HTMLInputElement> = {};
    saveButton: HTMLElement;

    constructor(
        app: App,
        plugin: TaskCollectorPlugin,
        taskCollector: TaskCollector
    ) {
        super(app, plugin);
        this.plugin = plugin;
        this.tc = taskCollector;
    }

    save() {
        Data.sanitize(this.plugin, this.newSettings);
        this.tc.init(this.newSettings);
        this.plugin.saveSettings();
        new Notice("(TC) Configuration saved");
    }

    /** Save on exit */
    hide(): void {
        this.save();
    }

    /** Show/validate setting changes */
    display(): void {
        this.newSettings = JSON.parse(JSON.stringify(this.tc.settings));
        this.drawElements();
    }

    drawElements(): void {
        this.containerEl.empty();
        this.containerEl.addClass("task-collector-settings");

        new Setting(this.containerEl).setHeading().setName("Task Collector");

        new Setting(this.containerEl)
            .setName("Save settings")
            .setClass("task-collector-save-reset")
            .addButton((button) =>
                button
                    .setIcon("reset")
                    .setTooltip(
                        "Reset to previously saved (or generated) values"
                    )
                    .onClick(() => {
                        this.newSettings = JSON.parse(
                            JSON.stringify(this.tc.settings)
                        );
                        this.display();
                        new Notice("(TC) Configuration reset");
                    })
            )
            .addButton((button) => {
                button
                    .setIcon("save")
                    .setTooltip("Save current values")
                    .onClick(() => {
                        this.save();
                    });
                this.saveButton = button.buttonEl;
            });

        new Setting(this.containerEl)
            .setName("Task Collection")
            .setDesc(
                "Enable task collection (additional task group settings when enabled)"
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(this.newSettings.collectionEnabled)
                    .onChange(async (value) => {
                        const redraw =
                            value != this.newSettings.collectionEnabled;
                        this.newSettings.collectionEnabled = value;
                        if (redraw) {
                            this.drawElements();
                        }
                    })
            );

        new Setting(this.containerEl)
            .setName("Define task mark cycle")
            .setDesc(
                "Specify characters (as a string) for Previous/Next commands"
            )
            .addText((input) =>
                input
                    .setPlaceholder("")
                    .setValue(this.newSettings.markCycle)
                    .onChange(async (value) => {
                        this.newSettings.markCycle = [...new Set(value)].join(
                            ""
                        );
                    })
            );

        new Setting(this.containerEl).setHeading().setName("Task Groups");

        this.containerEl.createEl("p", {
            text:
                "Task collector configures tasks in groups. " +
                "Each group can be associated with one or more task marks ('x' or '>'). " +
                "The default group configuration will apply to any mark not otherwise assigned to a group.",
        });

        this.containerEl.createEl("p", {
            text:
                "Marks that you define within the following groups appear in the selection modal. " +
                "Those marks that 'complete' a task will appear in the top row.",
        });

        this.groupList = this.containerEl.createEl("dl");
        this.showTaskGroups();

        new Setting(this.containerEl)
            .setClass("tc-create-task-group")
            .addButton((button: ButtonComponent) =>
                button
                    .setTooltip("Add a new task group")
                    .setButtonText("+")
                    .onClick(() => {
                        const name = `group-${
                            Object.values(this.newSettings.groups).length
                        }`;
                        Data.createSettingsGroup(
                            this.newSettings.groups,
                            name,
                            {}
                        );
                        this.showTaskGroups();
                    })
            );

        new Setting(this.containerEl).setHeading().setName("Menus and Modals");

        this.containerEl.createEl("p", {
            text:
                "Task Collector creates commands that can be bound to hotkeys or accessed using slash commands for marking tasks. " +
                "The following settings add right click context menu items for those commands.",
        });

        new Setting(this.containerEl)
            .setName("Prompt on checkbox click in Reading or Live preview mode")
            .setDesc(
                "When you click a checkbox, display a panel that allows you to select (with mouse or keyboard) the value to assign."
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(this.newSettings.previewClickModal)
                    .onChange(async (value) => {
                        this.newSettings.previewClickModal = value;
                    })
            );

        new Setting(this.containerEl)
            .setName("Add '(TC) Mark task' menu item")
            .setDesc(
                "Add an item to the right-click menu to mark the task on the current line (or within the current selection). This menu item will trigger a quick pop-up modal to select the desired mark value."
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(this.newSettings.contextMenu.markTask)
                    .onChange(async (value) => {
                        this.newSettings.contextMenu.markTask = value;
                    })
            );

        new Setting(this.containerEl)
            .setName("Add `(TC) Collect Tasks` menu item")
            .setDesc(
                "Add an item to the right-click menu to collect tasks (based on task configuration)."
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(this.newSettings.contextMenu.collectTasks)
                    .onChange(async (value) => {
                        this.newSettings.contextMenu.collectTasks = value;
                    })
            );

        new Setting(this.containerEl).setHeading().setName("Other settings");

        new Setting(this.containerEl)
            .setName("Debug")
            .setDesc("Enable debug messages")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.newSettings.debug)
                    .onChange(async (value) => {
                        this.newSettings.debug = value;
                    })
            );

        new Setting(this.containerEl)
            .setName("Convert non-list lines")
            .setDesc("Converts non-list lines when marking tasks")
            .addToggle((toggle) =>
                toggle
                    .setValue(this.newSettings.convertEmptyLines)
                    .onChange(async (value) => {
                        this.newSettings.convertEmptyLines = value;
                    })
            );
    }

    showTaskGroups() {
        this.markInputCache = {};
        this.otherInputCache = {};
        this.groupList.empty();
        this.clearButtonErrors();

        // default always comes first
        this.createGroupItem(this.newSettings.groups[DEFAULT_NAME]);

        // any/everything else
        Object.values(this.newSettings.groups)
            .filter((mts) => mts.name != DEFAULT_NAME)
            .forEach((mts) => {
                this.createGroupItem(mts);
            });
    }

    createGroupItem(mts: ManipulationSettings) {
        const dt = this.groupList.createEl("dt");
        const itemEl = this.groupList.createEl("dd");

        const nameSetting = new Setting(dt)
            .setName("Group name")
            .setDesc("Name for this group")
            .setClass("task-group-name");
        if (mts.name === TEXT_ONLY_NAME) {
            nameSetting.addExtraButton((b) => {
                b.setIcon("info")
                    .setTooltip(
                        "This is a special group that supports appending text to arbitrary lines of text"
                    )
                    .setDisabled(true);
            });
        }
        nameSetting.addText((text) => {
            text.setPlaceholder(COMPLETE_NAME)
                .setValue(mts.name)
                .setDisabled(mts.name === DEFAULT_NAME)
                .onChange(
                    debounce(
                        (value) => {
                            const target = this.newSettings.groups[value];
                            if (!value) {
                                text.inputEl.addClass("data-value-error");
                                text.inputEl.setAttribute(
                                    "aria-label",
                                    "A group name is required."
                                );
                            } else if (target && target != mts) {
                                text.inputEl.addClass("data-value-error");
                                text.inputEl.setAttribute(
                                    "aria-label",
                                    "This name is already used by another group"
                                );
                            } else {
                                text.inputEl.removeClass("data-value-error");
                                text.inputEl.removeAttribute("aria-label");
                                Data.moveGroup(
                                    this.newSettings.groups,
                                    mts.name,
                                    value
                                );
                                if (value === TEXT_ONLY_NAME) {
                                    mts.marks = TEXT_ONLY_MARK;
                                    // we just created the text group, redraw / rebuild cache
                                    this.drawElements();
                                }
                            }
                            this.testForErrors();
                        },
                        50,
                        true
                    )
                );
            this.addToCache(text.inputEl, "name-setting");
        });
        nameSetting.addExtraButton((b) => {
            b.setIcon(mts.name === DEFAULT_NAME ? "info" : "trash")
                .setTooltip(
                    mts.name === DEFAULT_NAME
                        ? "Default task settings"
                        : "Delete this group"
                )
                .setDisabled(mts.name === DEFAULT_NAME)
                .onClick(async () => {
                    delete this.newSettings.groups[mts.name];
                    this.showTaskGroups();
                });
        });
        if (mts.name === DEFAULT_NAME) {
            nameSetting.controlEl.addClass("default-group");
        } else if (mts.name === TEXT_ONLY_NAME) {
            nameSetting.controlEl.addClass("text-only-group");
        }

        if (mts.name !== TEXT_ONLY_NAME) {
            const taskMarks = new Setting(itemEl)
                .setName("Task marks")
                .setClass("task-marks");

            if (mts.name !== DEFAULT_NAME) {
                taskMarks.addToggle((t) => {
                    t.setValue(mts.complete);
                    t.setTooltip(
                        "If enabled, this group represents completed items. Completed items appear in the top row of the selection menu."
                    ).onChange(async (value) => {
                        mts.complete = value;
                    });
                });
                taskMarks.setDesc(
                    "Set one or marks associated with this group as a string. e.g. '>?!'. Use a space for unmarked tasks. " +
                        "Enable the toggle if this group represents completed tasks."
                );
            } else {
                taskMarks.setDesc(
                    "Set one or marks associated with this group as a string. e.g. '>?!'. Use a space for unmarked tasks. "
                );
            }

            taskMarks.addText((input) => {
                input.setPlaceholder("xX").onChange(
                    debounce(
                        (value) => {
                            const newMarks = Data.sanitizeMarks(value);
                            if (newMarks != value) {
                                input.inputEl.value = newMarks;
                            }
                            if (newMarks != mts.marks) {
                                this.removeMarks(mts.marks, input.inputEl);

                                mts.marks = newMarks;
                                taskMarks.controlEl.setAttribute(
                                    "marks",
                                    mts.marks
                                );

                                this.findDuplicates(input.inputEl);
                            }
                        },
                        50,
                        true
                    )
                );
                // sanitize and display initial value
                mts.marks = Data.sanitizeMarks(mts.marks);
                input.setValue(mts.marks);
                taskMarks.controlEl.setAttribute("marks", mts.marks);
                this.findDuplicates(input.inputEl);
            });
        }

        new Setting(itemEl)
            .setName(`Append date to ${this.getDescription(mts)}`)
            .setDesc(
                `Append today's date in the given moment.js format to the end of the ${this.getDescription(
                    mts
                )}`
            )
            .addMomentFormat((momentFormat) => {
                momentFormat
                    .setPlaceholder("YYYY-MM-DD")
                    .setValue(mts.appendDateFormat)
                    .onChange(
                        debounce(
                            (value) => {
                                try {
                                    // Try formatting "now" with the specified format string
                                    const now = moment().format(value);
                                    momentFormat.inputEl.removeClass(
                                        "data-value-error"
                                    );
                                    momentFormat.inputEl.setAttribute(
                                        "aria-label",
                                        now
                                    );
                                    mts.appendDateFormat = value;
                                } catch (e) {
                                    momentFormat.inputEl.addClass(
                                        "data-value-error"
                                    );
                                    momentFormat.inputEl.setAttribute(
                                        "aria-label",
                                        `An error occurred parsing this moment string. See log for details.`
                                    );
                                    console.error(
                                        `Error parsing specified date format for ${mts.name}: ${value}`
                                    );
                                }
                                this.testForErrors();
                            },
                            200,
                            true
                        )
                    );
                this.addToCache(momentFormat.inputEl, "moment-format");
            });
        new Setting(itemEl)
            .setName(
                `Remove text matching pattern from ${this.getDescription(mts)}`
            )
            .setDesc(
                `Text matching this regular expression will be removed from ${this.getDescription(
                    mts
                )}. Be careful! Test your expression first. The global flag ('g') is used for a per-line match.`
            )
            .addText((text) =>
                text
                    .setPlaceholder(" #(todo|task)")
                    .setValue(mts.removeExpr)
                    .onChange(
                        debounce(
                            (value) => {
                                try {
                                    // try compiling the regular expression
                                    _regex.tryRemoveTextRegex(value);
                                    mts.removeExpr = value;
                                    this.tc.logDebug(
                                        "remove regex",
                                        mts.name,
                                        mts.removeExpr
                                    );
                                } catch (e) {
                                    console.error(
                                        `Error parsing specified text replacement regular expression for ${mts.name}: ${value}`
                                    );
                                }
                            },
                            50,
                            true
                        )
                    )
            );

        new Setting(itemEl)
            .setName("Register '(TC) Mark with... ' command")
            .setDesc(
                mts.name === TEXT_ONLY_NAME
                    ? "A command will be registered to append text to selected lines"
                    : "A command will be registered for each mark in the group."
            )
            .addToggle((toggle) =>
                toggle.setValue(mts.registerCommand).onChange((value) => {
                    mts.registerCommand = value;
                })
            );

        new Setting(itemEl)
            .setName("Add '(TC) Mark with... ' menu item")
            .setDesc(
                "A right-click menu item will be added for each mark in the group."
            )
            .addToggle((toggle) =>
                toggle.setValue(mts.useContextMenu).onChange(async (value) => {
                    mts.useContextMenu = value;
                })
            );

        if (this.newSettings.collectionEnabled && mts.name !== TEXT_ONLY_NAME) {
            if (!mts.collection) {
                mts.collection = JSON.parse(JSON.stringify(DEFAULT_COLLECTION));
            }
            new Setting(itemEl)
                .setName("Area heading")
                .setClass("area-heading")
                .setDesc(
                    "Marked tasks will be collected and moved under the specified heading. Task collection for a group only occurs when an area heading is configured."
                )
                .addText((text) =>
                    text
                        .setPlaceholder("## Example")
                        .setValue(mts.collection.areaHeading)
                        .onChange(async (value) => {
                            mts.collection.areaHeading = value;
                        })
                );
            new Setting(itemEl)
                .setName("Remove checkbox")
                .setClass("remove-checkbox")
                .setDesc("When a task is collected, remove the checkbox")
                .addToggle((toggle) =>
                    toggle
                        .setValue(mts.collection.removeCheckbox)
                        .onChange(async (value) => {
                            mts.collection.removeCheckbox = value;
                        })
                );
        }
    }

    private removeMarks(oldValue: string, input: HTMLInputElement) {
        const marks = oldValue ? oldValue.split("") : [];
        this.tc.logDebug(
            `removeMarks begin: '${oldValue}'`,
            this.markInputCache
        );

        if (input.hasClass("no-marks-defined")) {
            input.removeClass("no-marks-defined");
            input.removeClass("data-value-error");
            input.removeAttribute("aria-label");
        }

        marks.forEach((x) => {
            this.tc.logDebug(
                `(TC): remove mark '${x}'`,
                this.markInputCache[x]
            );
            if (this.markInputCache[x]) {
                const set = this.markInputCache[x];
                set.delete(input);
                this.tryRemoveConflict(x, input);

                // if there is only one element left in the array,
                // remove the current character from the list of conflicts
                if (set.size == 1) {
                    set.forEach((i) => this.tryRemoveConflict(x, i));
                }
            }
        });
        this.tc.logDebug(`removeMarks end: '${oldValue}'`, this.markInputCache);
    }

    private findDuplicates(input: HTMLInputElement) {
        const marks = input.value ? input.value.split("") : [];
        this.tc.logDebug(
            `findDuplicates begin: '${input.value}'`,
            marks,
            input,
            this.markInputCache
        );

        // add input element into the cache (new marks)
        marks.forEach((x) => {
            if (this.markInputCache[x]) {
                const set = this.markInputCache[x];
                set.add(input);

                if (set.size > 1) {
                    // we have a conflict over a defined task mark
                    set.forEach((i) => this.trySetConflict(x, i));
                    console.error(
                        `(TC) More then one group uses task mark ${this.showMark(
                            x
                        )}`
                    );
                }
            } else {
                // no conflict, all is well.
                this.markInputCache[x] = new Set();
                this.markInputCache[x].add(input);
            }
        });

        if (marks.length == 0) {
            input.addClass("no-marks-defined");
            input.addClass("data-value-error");
            input.setAttribute(
                "aria-label",
                this.newSettings.groups[TEXT_ONLY_NAME]
                    ? "Must define one or more marks for this group."
                    : `Must define one or more marks for this group. Change the name to '${TEXT_ONLY_NAME}' for special text-only behavior.`
            );
            this.tc.logDebug(
                `findDuplicates end (empty): '${input.value}'`,
                input,
                this.markInputCache
            );
        }

        this.tc.logDebug(
            `findDuplicates end: '${input.value}'`,
            input,
            this.markInputCache
        );
        this.testForErrors();
    }

    private trySetConflict(mark: string, input: HTMLInputElement) {
        const existing = input.getAttribute("conflict") || "";
        const conflict = Data.sanitizeMarks(existing + mark);

        input.setAttribute("conflict", conflict);
        input.addClass("data-value-error");
        input.setAttribute(
            "aria-label",
            `More than one task group uses ${this.showMark(conflict)}`
        );
        this.tc.logDebug(
            `conflicts for '${input.value}': '${this.showMark(conflict)}'`
        );
    }

    private tryRemoveConflict(mark: string, input: HTMLInputElement) {
        if (!input.hasAttribute("conflict")) {
            return;
        }
        const remaining = input.getAttribute("conflict").replace(mark, "");
        if (remaining.length == 0) {
            // all conflicting marks have been removed
            input.removeAttribute("conflict");
            input.removeClass("data-value-error");
            input.removeAttribute("aria-label");
        } else {
            input.removeAttribute("conflict");
            this.trySetConflict(remaining, input);
        }
    }

    private getDescription(mts: ManipulationSettings) {
        return mts.name === TEXT_ONLY_NAME
            ? "selected lines of text"
            : "selected task(s)";
    }

    private showMark(x: string) {
        return x == TEXT_ONLY_MARK ? "(empty)" : x;
    }

    private clearButtonErrors() {
        // Modal create or reset
        this.saveButton.removeClass("data-value-error");
        this.saveButton.removeAttribute("aria-label");
    }

    private testForErrors() {
        const hasMarkErrors = Object.values(this.markInputCache)
            .flatMap((s) => Array.from(s.values()))
            .find((i) => i.hasClass("data-value-error"));
        const hasMomentErrors = Object.values(this.otherInputCache).find((i) =>
            i.hasClass("data-value-error")
        );

        if (hasMarkErrors || hasMomentErrors) {
            this.saveButton.addClass("data-value-error");
            this.saveButton.setAttribute(
                "aria-label",
                `There are configuration errors. Correct those before saving.`
            );
        } else {
            this.saveButton.removeClass("data-value-error");
            this.saveButton.removeAttribute("aria-label");
        }
    }

    private addToCache(input: HTMLInputElement, name: string) {
        const i = Object.values(this.otherInputCache).length;
        this.otherInputCache[`${name}-${i}`] = input;
        input.setAttribute("cache-id", `${name}-${i}`);
    }

    private removeFromCache(input: HTMLInputElement) {
        const id = input.getAttribute("cache-id");
        if (id) {
            delete this.otherInputCache[id];
        }
    }
}
