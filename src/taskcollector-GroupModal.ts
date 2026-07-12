import {
    type App,
    type ButtonComponent,
    debounce,
    Modal,
    Setting,
} from "obsidian";
import type {
    CollectionSettings,
    ManipulationSettings,
    TaskCollectorSettings,
} from "./@types/settings";
import type TaskCollectorPlugin from "./main";
import { momentFn } from "./moment";
import {
    DEFAULT_COLLECTION,
    DEFAULT_NAME,
    PLACEHOLDER_MARK,
    TEXT_ONLY_MARK,
    TEXT_ONLY_NAME,
} from "./taskcollector-Constants";
import { Data } from "./taskcollector-Data";
import { _regex, type TaskCollector } from "./taskcollector-TaskCollector";

export class TaskCollectorGroupModal extends Modal {
    plugin: TaskCollectorPlugin;
    tc: TaskCollector;
    mts: ManipulationSettings;
    onSave: () => void;

    private draft: ManipulationSettings;
    private saveButton: ButtonComponent | undefined;
    private hasError = false;
    private markInputCache: Record<string, Set<HTMLInputElement>> = {};

    constructor(
        app: App,
        plugin: TaskCollectorPlugin,
        tc: TaskCollector,
        mts: ManipulationSettings,
        onSave: () => void,
    ) {
        super(app);
        this.plugin = plugin;
        this.tc = tc;
        this.mts = mts;
        this.onSave = onSave;
        this.draft = JSON.parse(JSON.stringify(mts)) as ManipulationSettings;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass("task-collector-group-modal");

        this.titleEl.setText(
            this.mts.name === DEFAULT_NAME
                ? "Edit default group"
                : `Edit group: ${this.mts.name}`,
        );

        this.renderSettings(contentEl);
        this.renderButtons(contentEl);
    }

    onClose(): void {
        this.contentEl.empty();
    }

    private renderSettings(containerEl: HTMLElement): void {
        const settings = this.tc.settings;

        // Group name
        const nameSetting = new Setting(containerEl)
            .setName("Group name")
            .setDesc("Name for this group")
            .setClass("task-group-name");

        if (this.draft.name === TEXT_ONLY_NAME) {
            nameSetting.addExtraButton((b) =>
                b
                    .setIcon("info")
                    .setTooltip(
                        "This is a special group that supports appending text to arbitrary lines of text",
                    )
                    .setDisabled(true),
            );
        }

        nameSetting.addText((text) => {
            text.setPlaceholder("Group name")
                .setValue(this.draft.name)
                .setDisabled(
                    this.draft.name === DEFAULT_NAME ||
                        this.draft.name === TEXT_ONLY_NAME,
                )
                .onChange(
                    debounce(
                        (value) => {
                            const existing = settings.groups[value];
                            if (!value) {
                                this.setInputError(
                                    text.inputEl,
                                    "A group name is required.",
                                );
                            } else if (existing && existing !== this.mts) {
                                this.setInputError(
                                    text.inputEl,
                                    "This name is already used by another group.",
                                );
                            } else if (value === TEXT_ONLY_NAME) {
                                this.setInputError(
                                    text.inputEl,
                                    `'${TEXT_ONLY_NAME}' is a reserved name for the special text-only group.`,
                                );
                            } else {
                                this.clearInputError(text.inputEl);
                                this.draft.name = value;
                            }
                            this.updateSaveButton();
                        },
                        50,
                        true,
                    ),
                );
        });

        // Task marks (not for TEXT_ONLY_NAME)
        if (this.draft.name !== TEXT_ONLY_NAME) {
            const taskMarks = new Setting(containerEl)
                .setName("Task marks")
                .setClass("task-marks");

            if (this.draft.name !== DEFAULT_NAME) {
                taskMarks.addToggle((t) =>
                    t
                        .setValue(this.draft.complete)
                        .setTooltip(
                            "If enabled, this group represents completed items. Completed items appear in the top row of the selection menu.",
                        )
                        .onChange((value) => {
                            this.draft.complete = value;
                        }),
                );
                taskMarks.setDesc(
                    "Set marks associated with this group as a string, for example: '>?!'. Use a space for unmarked tasks. " +
                        "Enable the toggle if this group represents completed tasks.",
                );
            } else {
                taskMarks.setDesc(
                    "Set marks associated with this group as a string, for example: '>?!'. Use a space for unmarked tasks.",
                );
            }

            taskMarks.addText((input) => {
                this.draft.marks = Data.sanitizeMarks(this.draft.marks);
                const displayMarks =
                    this.draft.marks === PLACEHOLDER_MARK
                        ? ""
                        : this.draft.marks;
                input.setPlaceholder("xX").setValue(displayMarks);
                taskMarks.controlEl.setAttribute("marks", displayMarks);
                this.findDuplicates(input.inputEl, settings);

                input.onChange(
                    debounce(
                        (value) => {
                            const newMarks = Data.sanitizeMarks(value);
                            if (newMarks !== value) {
                                input.inputEl.value = newMarks;
                            }
                            if (newMarks !== this.draft.marks) {
                                this.removeMarks(
                                    this.draft.marks,
                                    input.inputEl,
                                );
                                this.draft.marks = newMarks;
                                taskMarks.controlEl.setAttribute(
                                    "marks",
                                    newMarks,
                                );
                                this.findDuplicates(input.inputEl, settings);
                            }
                            this.updateSaveButton();
                        },
                        50,
                        true,
                    ),
                );
            });
        }

        // Append date format
        new Setting(containerEl)
            .setName(
                `Append date to ${this.draft.name === TEXT_ONLY_NAME ? "selected lines of text" : "selected task(s)"}`,
            )
            .setDesc(
                `Append today's date in the given moment.js format to the end of the ${this.draft.name === TEXT_ONLY_NAME ? "selected lines of text" : "selected task(s)"}`,
            )
            .addMomentFormat((momentFormat) => {
                momentFormat
                    .setPlaceholder("YYYY-MM-DD")
                    .setValue(this.draft.appendDateFormat)
                    .onChange(
                        debounce(
                            (value) => {
                                try {
                                    const now = momentFn().format(value);
                                    this.clearInputError(momentFormat.inputEl);
                                    momentFormat.inputEl.setAttribute(
                                        "aria-label",
                                        now,
                                    );
                                    this.draft.appendDateFormat = value;
                                } catch (e) {
                                    this.setInputError(
                                        momentFormat.inputEl,
                                        "An error occurred parsing this moment string. See log for details.",
                                    );
                                    console.error(
                                        `Error parsing date format for ${this.draft.name}: ${value}`,
                                        e,
                                    );
                                }
                                this.updateSaveButton();
                            },
                            200,
                            true,
                        ),
                    );
            });

        // Remove text matching pattern
        let testSetting: Setting;
        new Setting(containerEl)
            .setName(
                `Remove text matching pattern from ${this.draft.name === TEXT_ONLY_NAME ? "selected lines of text" : "selected task(s)"}`,
            )
            .setDesc(
                `Text matching this regular expression will be removed. Be careful! Test your expression first. The global flag ('g') is used for a per-line match.`,
            )
            .addText((text) =>
                text
                    .setPlaceholder(" #(todo|task)")
                    .setValue(this.draft.removeExpr)
                    .onChange(
                        debounce(
                            (value) => {
                                if (!value) {
                                    testSetting?.settingEl.addClass(
                                        "regex-hidden",
                                    );
                                    this.draft.removeExpr = value;
                                    this.clearInputError(text.inputEl);
                                    this.updateSaveButton();
                                    return;
                                }
                                testSetting?.settingEl.removeClass(
                                    "regex-hidden",
                                );
                                try {
                                    const regex =
                                        _regex.tryRemoveTextRegex(value);
                                    this.draft.removeExpr = value;
                                    const hasDoubleEscapes =
                                        /\\\\[dswDSW]|\\\\[{}[\]]/u.test(value);
                                    if (hasDoubleEscapes) {
                                        this.setInputError(
                                            text.inputEl,
                                            `Warning: Pattern may be over-escaped. Use \\d not \\\\d, \\{ not \\\\{, etc. Current: /${regex?.source}/g`,
                                        );
                                    } else {
                                        this.clearInputError(text.inputEl);
                                        text.inputEl.setAttribute(
                                            "aria-label",
                                            `Valid regex: /${regex?.source || value}/g`,
                                        );
                                    }
                                } catch (e) {
                                    const msg =
                                        e instanceof Error
                                            ? e.message
                                            : JSON.stringify(e);
                                    this.setInputError(
                                        text.inputEl,
                                        `Invalid regex: ${msg}`,
                                    );
                                    console.error(
                                        `Error parsing text removal regex for ${this.draft.name}: ${value}`,
                                        e,
                                    );
                                }
                                this.updateSaveButton();
                            },
                            50,
                            true,
                        ),
                    ),
            );

        testSetting = new Setting(containerEl)
            .setClass("regex-test-setting")
            .setDesc(
                "Test your regex: enter sample text to see what will be removed",
            )
            .addText((testInput) => {
                testInput.setPlaceholder("- [ ] something #todo").onChange(
                    debounce(
                        (value) => {
                            if (this.draft.removeExpr) {
                                try {
                                    const regex = _regex.tryRemoveTextRegex(
                                        this.draft.removeExpr,
                                    );
                                    if (regex && value) {
                                        this.updateTestResult(
                                            testInput.inputEl,
                                            regex,
                                        );
                                    } else {
                                        testInput.inputEl.removeAttribute(
                                            "aria-label",
                                        );
                                    }
                                } catch {
                                    testInput.inputEl.setAttribute(
                                        "aria-label",
                                        "Cannot test: regex is invalid",
                                    );
                                }
                            }
                        },
                        100,
                        true,
                    ),
                );
            });

        if (!this.draft.removeExpr) {
            testSetting.settingEl.addClass("regex-hidden");
        }

        // Register command
        new Setting(containerEl)
            .setName("Register '(TC) mark with...' command")
            .setDesc(
                this.draft.name === TEXT_ONLY_NAME
                    ? "A command will be registered to append text to selected lines"
                    : "A command will be registered for each mark in the group.",
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(this.draft.registerCommand)
                    .onChange((value) => {
                        this.draft.registerCommand = value;
                    }),
            );

        // Add menu item
        new Setting(containerEl)
            .setName("Add '(TC) mark with...' menu item")
            .setDesc(
                "A right-click menu item will be added for each mark in the group.",
            )
            .addToggle((toggle) =>
                toggle.setValue(this.draft.useContextMenu).onChange((value) => {
                    this.draft.useContextMenu = value;
                }),
            );

        // Collection settings (when collectionEnabled and not TEXT_ONLY)
        if (settings.collectionEnabled && this.draft.name !== TEXT_ONLY_NAME) {
            if (!this.draft.collection) {
                this.draft.collection = JSON.parse(
                    JSON.stringify(DEFAULT_COLLECTION),
                ) as CollectionSettings;
            }
            const collection = this.draft.collection;

            new Setting(containerEl)
                .setName("Area heading")
                .setClass("area-heading")
                .setDesc(
                    "Marked tasks will be collected and moved under the specified heading. Task collection for a group only occurs when an area heading is configured.",
                )
                .addText((text) =>
                    text
                        .setPlaceholder("## Example")
                        .setValue(collection.areaHeading)
                        .onChange((value) => {
                            collection.areaHeading = value;
                        }),
                );

            new Setting(containerEl)
                .setName("Remove checkbox")
                .setClass("remove-checkbox")
                .setDesc("When a task is collected, remove the checkbox")
                .addToggle((toggle) =>
                    toggle
                        .setValue(collection.removeCheckbox)
                        .onChange((value) => {
                            collection.removeCheckbox = value;
                        }),
                );
        }
    }

    private renderButtons(containerEl: HTMLElement): void {
        const buttonRow = new Setting(containerEl).setClass(
            "task-collector-modal-buttons",
        );

        buttonRow.addButton((btn) => {
            btn.setButtonText("Cancel").onClick(() => this.close());
        });

        buttonRow.addButton((btn) => {
            this.saveButton = btn;
            btn.setButtonText("Save")
                .setCta()
                .onClick(async () => {
                    if (this.hasError) return;

                    const oldName = this.mts.name;
                    const newName = this.draft.name;

                    // Apply draft back to the live group entry
                    Object.assign(this.mts, this.draft);

                    // Rename group key if name changed
                    if (oldName !== newName && oldName !== DEFAULT_NAME) {
                        Data.moveGroup(
                            this.plugin,
                            this.tc.settings.groups,
                            oldName,
                            newName,
                        );
                    }

                    this.tc.init(this.tc.settings);
                    await this.plugin.saveSettings();
                    this.onSave();
                    this.close();
                });
        });
    }

    private updateSaveButton(): void {
        const hasErrors = this.contentEl.querySelector(".data-value-error");
        this.hasError = !!hasErrors;
        this.saveButton?.setDisabled(this.hasError);
    }

    private setInputError(el: HTMLInputElement, message: string): void {
        el.addClass("data-value-error");
        el.setAttribute("aria-label", message);
    }

    private clearInputError(el: HTMLInputElement): void {
        el.removeClass("data-value-error");
        el.removeAttribute("aria-label");
    }

    private updateTestResult(testInput: HTMLInputElement, regex: RegExp): void {
        const testText = testInput.value;
        if (!testText) {
            testInput.removeAttribute("aria-label");
            return;
        }
        const match = testText.match(regex);
        if (match) {
            const removed = match[0];
            const result = testText.replace(new RegExp(regex.source, "g"), "");
            testInput.setAttribute(
                "aria-label",
                `Will remove: "${removed}" → Result: "${result}"`,
            );
        } else {
            testInput.setAttribute(
                "aria-label",
                "No match - nothing will be removed from this text",
            );
        }
    }

    private removeMarks(oldValue: string, input: HTMLInputElement): void {
        const marks = oldValue ? oldValue.split("") : [];
        for (const x of marks) {
            if (this.markInputCache[x]) {
                const set = this.markInputCache[x];
                set.delete(input);
                this.tryRemoveConflict(x, input);
                if (set.size === 1) {
                    for (const i of set) {
                        this.tryRemoveConflict(x, i);
                    }
                }
            }
        }
    }

    private findDuplicates(
        input: HTMLInputElement,
        settings: TaskCollectorSettings,
    ): void {
        const marks = input.value ? input.value.split("") : [];

        // Build cross-group cache from all other groups
        this.markInputCache = {};
        for (const g of Object.values(settings.groups)) {
            if (g.name !== this.mts.name && g.marks) {
                for (const x of g.marks.split("")) {
                    if (!this.markInputCache[x]) {
                        this.markInputCache[x] = new Set();
                    }
                    this.markInputCache[x].add(input);
                }
            }
        }

        // Check draft marks for duplicates with other groups
        for (const x of marks) {
            if (this.markInputCache[x] && this.markInputCache[x].size > 0) {
                this.trySetConflict(x, input);
                console.error(
                    `(TC) More than one group uses task mark ${x === TEXT_ONLY_MARK ? "(empty)" : x}`,
                );
            }
        }

        if (marks.length === 0) {
            input.addClass("no-marks-defined");
            input.addClass("data-value-error");
            input.setAttribute(
                "aria-label",
                settings.groups[TEXT_ONLY_NAME]
                    ? "Must define one or more marks for this group."
                    : "Must define one or more marks for this group. " +
                          "Use the text-only button in Task groups for special text-only behavior.",
            );
        } else if (input.hasClass("no-marks-defined")) {
            input.removeClass("no-marks-defined");
            if (!input.hasAttribute("conflict")) {
                input.removeClass("data-value-error");
                input.removeAttribute("aria-label");
            }
        }

        this.updateSaveButton();
    }

    private trySetConflict(mark: string, input: HTMLInputElement): void {
        const existing = input.getAttribute("conflict") || "";
        const conflict = Data.sanitizeMarks(existing + mark);
        input.setAttribute("conflict", conflict);
        input.addClass("data-value-error");
        input.setAttribute(
            "aria-label",
            `More than one task group uses ${mark === TEXT_ONLY_MARK ? "(empty)" : mark}`,
        );
    }

    private tryRemoveConflict(mark: string, input: HTMLInputElement): void {
        if (!input.hasAttribute("conflict")) return;
        const remaining = (input.getAttribute("conflict") ?? "").replace(
            mark,
            "",
        );
        if (remaining.length === 0) {
            input.removeAttribute("conflict");
            input.removeClass("data-value-error");
            input.removeAttribute("aria-label");
        } else {
            input.removeAttribute("conflict");
            this.trySetConflict(remaining, input);
        }
    }
}
