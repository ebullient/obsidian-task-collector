import {
    type App,
    Notice,
    PluginSettingTab,
    type Setting,
    type SettingDefinitionItem,
    type SettingGroupItem,
} from "obsidian";
import type { ManipulationSettings } from "./@types/settings";
import type TaskCollectorPlugin from "./main";
import { DEFAULT_NAME, TEXT_ONLY_NAME } from "./taskcollector-Constants";
import { Data } from "./taskcollector-Data";
import { TaskCollectorGroupModal } from "./taskcollector-GroupModal";
import type { TaskCollector } from "./taskcollector-TaskCollector";

export function uniqueMarkCycleChars(value: string): string {
    return Array.from(new Set(value.split(""))).join("");
}

export class TaskCollectorSettingsTab extends PluginSettingTab {
    plugin: TaskCollectorPlugin;
    tc: TaskCollector;

    constructor(
        app: App,
        plugin: TaskCollectorPlugin,
        taskCollector: TaskCollector,
    ) {
        super(app, plugin);
        this.plugin = plugin;
        this.tc = taskCollector;
        this.icon = "tornado";
    }

    getControlValue(key: string): unknown {
        return (this.tc.settings as Record<string, unknown>)[key];
    }

    async setControlValue(key: string, value: unknown): Promise<void> {
        (this.tc.settings as Record<string, unknown>)[key] = value;
        if (key === "previewClickModal") {
            new Notice(
                "Updated live preview settings; restart Obsidian to apply changes.",
            );
        }
        this.tc.init(this.tc.settings);
        await this.plugin.saveSettings();
        if (key === "collectionEnabled") {
            this.update();
        }
    }

    getSettingDefinitions(): SettingDefinitionItem[] {
        const s = this.tc.settings;

        const groupItems: SettingGroupItem[] = [
            {
                name: "",
                searchable: false,
                render: (setting: Setting) => {
                    setting.descEl.replaceWith(
                        createFragment((f) => {
                            f.createEl("p", {
                                text:
                                    "Task collector configures tasks in groups. " +
                                    "Each group can be associated with one or more task marks ('x' or '>'). " +
                                    "The default group configuration will apply to any mark not otherwise assigned to a group.",
                            });
                            f.createEl("p", {
                                text:
                                    "Marks that you define within the following groups appear in the selection modal. " +
                                    "Those marks that 'complete' a task will appear in the top row.",
                            });
                        }),
                    );
                },
            },
        ];

        // Default group first, then others
        const groups = [
            s.groups[DEFAULT_NAME],
            ...Object.values(s.groups).filter((g) => g.name !== DEFAULT_NAME),
        ];

        for (const mts of groups) {
            groupItems.push(this.groupSummaryDefinition(mts));
        }

        // Add group button
        groupItems.push({
            name: "",
            searchable: false,
            render: (setting: Setting) => {
                setting.settingEl.addClass("tc-create-task-group");
                setting.addButton((btn) =>
                    btn
                        .setTooltip("Add a new task group")
                        .setButtonText("+")
                        .onClick(() => {
                            const name = `group-${Object.values(s.groups).length}`;
                            Data.createSettingsGroup(s.groups, name, {});
                            this.update();
                        }),
                );
            },
        });

        return [
            {
                name: "Task collection",
                desc: "Enable task collection (additional task group settings when enabled)",
                control: { type: "toggle", key: "collectionEnabled" },
            },
            {
                name: "Define task mark cycle",
                desc: "Specify characters (as a string) for previous/next commands. Use the button to include checkbox removal in the cycle.",
                render: (setting: Setting) => {
                    setting.addText((input) =>
                        input
                            .setPlaceholder("")
                            .setValue(s.markCycle.replace("§", ""))
                            .onChange(async (value) => {
                                s.markCycle = uniqueMarkCycleChars(value);
                                this.tc.init(s);
                                await this.plugin.saveSettings();
                            }),
                    );
                    setting.addExtraButton((button) => {
                        const el = button
                            .setTooltip(
                                `Include checkbox removal in the cycle: ${s.markCycleRemoveTask}`,
                            )
                            .setIcon("cross-in-box")
                            .onClick(async () => {
                                s.markCycleRemoveTask = !s.markCycleRemoveTask;
                                el.classList.toggle(
                                    "is-active",
                                    s.markCycleRemoveTask,
                                );
                                button.setTooltip(
                                    `Include checkbox removal in the cycle: ${s.markCycleRemoveTask}`,
                                );
                                this.tc.init(s);
                                await this.plugin.saveSettings();
                            }).extraSettingsEl;
                        el.classList.toggle("is-active", s.markCycleRemoveTask);
                    });
                },
            },
            {
                name: "Convert non-list lines",
                desc: "Converts non-list lines when marking tasks",
                control: { type: "toggle", key: "convertEmptyLines" },
            },
            {
                name: "Skip matching sections",
                desc: "When collecting tasks, skip content of sections that match the specified pattern",
                control: { type: "text", key: "skipSectionMatch" },
            },
            {
                type: "group",
                heading: "Task groups",
                items: groupItems,
            },
            {
                type: "group",
                heading: "Menus and modals",
                items: [
                    {
                        name: "",
                        searchable: false,
                        render: (setting: Setting) => {
                            setting.descEl.replaceWith(
                                createFragment((f) => {
                                    f.createEl("p", {
                                        text:
                                            "Task Collector creates commands that can be bound to hotkeys or accessed using slash commands for marking tasks. " +
                                            "The following settings add right click context menu items for those commands.",
                                    });
                                }),
                            );
                        },
                    },
                    {
                        name: "Click handling: prompt when the checkbox is clicked",
                        desc: "When you click a checkbox, display a panel that allows you to select (with mouse or keyboard) the value to assign.",
                        control: { type: "toggle", key: "previewClickModal" },
                    },
                    {
                        name: "Add '(TC) Mark task' menu item",
                        desc: "Add an item to the right-click menu to mark the task on the current line (or within the current selection). This menu item will trigger a quick pop-up modal to select the desired mark value.",
                        render: (setting: Setting) => {
                            setting.addToggle((t) =>
                                t
                                    .setValue(s.contextMenu.markTask)
                                    .onChange(async (value) => {
                                        s.contextMenu.markTask = value;
                                        this.tc.init(s);
                                        await this.plugin.saveSettings();
                                    }),
                            );
                        },
                    },
                    {
                        name: "Add '(TC) Collect tasks' menu item",
                        desc: "Add an item to the right-click menu to collect tasks (based on task configuration).",
                        render: (setting: Setting) => {
                            setting.addToggle((t) =>
                                t
                                    .setValue(s.contextMenu.collectTasks)
                                    .onChange(async (value) => {
                                        s.contextMenu.collectTasks = value;
                                        this.tc.init(s);
                                        await this.plugin.saveSettings();
                                    }),
                            );
                        },
                    },
                    {
                        name: "Add '(TC) Reset all tasks' command and menu item",
                        desc: "Add a command and an item to the right-click menu to reset/clear all tasks in the current file.",
                        render: (setting: Setting) => {
                            setting.addToggle((t) =>
                                t
                                    .setValue(s.contextMenu.resetAllTasks)
                                    .onChange(async (value) => {
                                        s.contextMenu.resetAllTasks = value;
                                        this.tc.init(s);
                                        await this.plugin.saveSettings();
                                    }),
                            );
                        },
                    },
                ],
            },
            {
                type: "group",
                heading: "Other settings",
                items: [
                    {
                        name: "Hide notifications",
                        desc: "Hide pop-up notification messages (messages will be logged in the developer console)",
                        control: { type: "toggle", key: "hideNotifications" },
                    },
                    {
                        name: "Debug",
                        desc: "Enable debug messages",
                        control: { type: "toggle", key: "debug" },
                    },
                ],
            },
        ];
    }

    private groupSummaryDefinition(
        mts: ManipulationSettings,
    ): SettingGroupItem {
        return {
            name: mts.name === DEFAULT_NAME ? "Default group" : mts.name,
            desc: createFragment((f) => {
                const entries: [string, string][] = [];
                if (mts.name !== TEXT_ONLY_NAME && mts.marks) {
                    entries.push(["Marks", mts.marks]);
                }
                if (mts.appendDateFormat) {
                    entries.push(["Date format", mts.appendDateFormat]);
                }
                if (mts.removeExpr) {
                    entries.push(["Remove", `/${mts.removeExpr}/`]);
                }
                if (mts.collection?.areaHeading) {
                    entries.push(["Collects to", mts.collection.areaHeading]);
                }
                if (entries.length > 0) {
                    const ul = f.createEl("ul");
                    for (const [label, value] of entries) {
                        const li = ul.createEl("li");
                        li.createEl("b", { text: `${label}: ` });
                        li.createEl("code", { text: value });
                    }
                }
            }),
            render: (setting: Setting) => {
                setting.addExtraButton((btn) =>
                    btn
                        .setIcon("pencil")
                        .setTooltip("Edit group settings")
                        .onClick(() => {
                            new TaskCollectorGroupModal(
                                this.app,
                                this.plugin,
                                this.tc,
                                mts,
                                () => this.update(),
                            ).open();
                        }),
                );
                if (mts.name !== DEFAULT_NAME) {
                    setting.addExtraButton((btn) =>
                        btn
                            .setIcon("trash")
                            .setTooltip("Delete this group")
                            .onClick(() => {
                                delete this.tc.settings.groups[mts.name];
                                this.tc.init(this.tc.settings);
                                void this.plugin.saveSettings();
                                this.update();
                            }),
                    );
                }
            },
        };
    }
}
