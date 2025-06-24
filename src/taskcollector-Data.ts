// eslint-disable-file @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
import type {
    ManipulationSettings,
    TaskCollectorSettings,
    TcVersion,
} from "./@types/settings";
import {
    COMPLETE_NAME,
    DEFAULT_NAME,
    DEFAULT_SETTINGS,
    DEFAULT_SETTINGS_0,
    GROUP_DEFAULT,
    TEXT_ONLY_MARK,
    TEXT_ONLY_NAME,
} from "./taskcollector-Constants";
import type { TaskCollectorPlugin } from "./taskcollector-Plugin";

export const Data = {
    constructSettings,
    createSettingsGroup,
    sanitize,
    sanitizeMarks,
    moveGroup,
};

/**
 * Sort and remove duplicate characters from string
 * @param marks
 * @returns
 */
function sanitizeMarks(marks: string): string {
    const tmp = Array.from(new Set(marks));
    tmp.sort();
    return tmp.join("").replace(TEXT_ONLY_MARK, "");
}

function sanitize(tcp: TaskCollectorPlugin, settings: TaskCollectorSettings) {
    tcp.tc.logDebug("sanitize begin", settings);
    let dirty = false;

    // Make sure characters in cycle are unique
    if (settings.markCycle) {
        settings.markCycle = [...new Set(settings.markCycle)].join("");
        settings.markCycle.replace("§", "");
        if (settings.markCycleRemoveTask) {
            settings.markCycle += "§";
        }
    }

    // resolve groups with a key / mts.name mismatch
    for (const [name, mts] of Object.entries(settings.groups)) {
        if (name !== mts.name) {
            dirty = true; // ensure name & mts.name agree
            if (settings.groups[mts.name]) {
                console.warn(
                    `(TC) Group named ${mts.name} already exists. Reverting group name to ${name}`,
                );
                mts.name = name;
            } else {
                // move to the new name
                moveGroup(settings.groups, name, mts.name);
            }
        }
    }

    if (hasMark(settings.groups[TEXT_ONLY_NAME])) {
        dirty = true; // ensure text only group has no marks
        settings.groups[TEXT_ONLY_NAME].marks = TEXT_ONLY_MARK;
    }

    // check for multiple groups with empty marks
    const textOnlyGroups = Object.entries(settings.groups).filter(
        ([_, mts]) => !hasMark(mts),
    );
    if (textOnlyGroups.length > 1) {
        dirty = true;
        console.warn(
            `(TC) There can be only one group for text-only settings (${TEXT_ONLY_NAME}).`,
        );
        if (!settings.groups[TEXT_ONLY_NAME]) {
            // There is no text only group. Use the first found
            console.info(
                `(TC) Configuration: renamed group ${textOnlyGroups[0][1].name} to ${TEXT_ONLY_NAME}.`,
            );
            moveGroup(
                settings.groups,
                textOnlyGroups[0][1].name,
                TEXT_ONLY_NAME,
            );
        }
        let used = "";
        let nextMark: string;
        // filter from the top (post-move)
        for (const [name, mts] of Object.entries(settings.groups)) {
            if (!hasMark(mts) && name !== TEXT_ONLY_NAME) {
                [used, nextMark] = nextRandom(used);
                settings.groups[name].marks = nextMark;
            }
        }
    } else if (
        textOnlyGroups.length === 1 &&
        textOnlyGroups[0][1].name !== TEXT_ONLY_NAME
    ) {
        // Make sure the text only group has the required name
        console.info(
            `(TC) Configuration: renamed group ${textOnlyGroups[0][1].name} to ${TEXT_ONLY_NAME}.`,
        );
        moveGroup(settings.groups, textOnlyGroups[0][1].name, TEXT_ONLY_NAME);
    }

    // The text-only group is not subject to task collection
    if (settings.groups[TEXT_ONLY_NAME]) {
        if (settings.groups[TEXT_ONLY_NAME].collection) {
            settings.groups[TEXT_ONLY_NAME].collection = undefined;
        }
    }

    if (dirty) {
        tcp.tc.notify(
            "(TC) Configuration settings were modified. See console for details.",
        );
    }
    tcp.tc.logDebug("sanitize end", settings);
}

/**
 * Ensure loaded settings are valid for this version of the plugin
 * (will have trouble back-porting)
 * @param orig Original object (any)
 * @returns Properly formed TaskCollectorSettings
 */
async function constructSettings(
    tcp: TaskCollectorPlugin,
    // biome-ignore lint/suspicious/noExplicitAny: : old config formats
    orig: any,
): Promise<TaskCollectorSettings> {
    return orig.version
        ? await adaptSettings(tcp, orig)
        : await migrateSettings(tcp, orig);
}

/**
 * Incremental update of 1.x TaskCollectorSettings
 * @param obj Partial TaskCollectorSettings
 * @returns Properly formed TaskCollectorSettings
 */
async function adaptSettings(
    tcp: TaskCollectorPlugin,
    obj: Partial<TaskCollectorSettings>,
): Promise<TaskCollectorSettings> {
    const settings: TaskCollectorSettings = {
        ...DEFAULT_SETTINGS,
        ...obj,
    };

    sanitize(tcp, settings);

    const version = toVersion(tcp.manifest.version);
    if (compareVersion(version, settings.version) === 0) {
        return settings;
    }

    // Save the version and modified config
    settings.version = version;
    await tcp.saveData(settings);
    return settings;
}

async function migrateSettings(
    tcp: TaskCollectorPlugin,
    // biome-ignore lint/suspicious/noExplicitAny: old config formats
    orig: any,
): Promise<TaskCollectorSettings> {
    const old = {
        ...DEFAULT_SETTINGS_0,
        ...orig,
    };
    const settings: TaskCollectorSettings = JSON.parse(
        JSON.stringify(DEFAULT_SETTINGS),
    ); // deep copy

    // Menus and Modals

    settings.previewClickModal = old.previewOnClick;
    settings.contextMenu.markTask = old.rightClickMark;
    settings.contextMenu.resetTask = old.rightClickResetTask;
    settings.groups[COMPLETE_NAME].useContextMenu = old.rightClickComplete;

    // Groups and marks

    let marks = "x";
    if (!old.onlyLowercaseX) {
        marks += "X";
    }
    if (old.supportCanceledTasks) {
        marks += "-";
    }
    settings.groups[COMPLETE_NAME].marks = sanitizeMarks(marks);
    settings.groups[COMPLETE_NAME].appendDateFormat = old.appendDateFormat;
    settings.groups[COMPLETE_NAME].removeExpr = old.removeExpression;

    marks = old.incompleteTaskValues;
    settings.groups[DEFAULT_NAME].marks = sanitizeMarks(marks);
    if (old.appendRemoveAllTasks) {
        settings.groups[DEFAULT_NAME].appendDateFormat = old.appendDateFormat;
        settings.groups[DEFAULT_NAME].removeExpr = old.removeExpression;
    }

    // Task Collector default
    settings.collectionEnabled = true;
    settings.contextMenu.collectTasks = old.rightClickMove || false;

    // Task Marker

    if (orig.cycleTaskValues) {
        settings.markCycle = orig.cycleTaskValues;
        if (orig.incompleteTaskValuesRow2) {
            createSettingsGroup(settings.groups, "group-2", {
                marks: sanitizeMarks(orig.incompleteTaskValuesRow2),
                appendDateFormat: orig.appendTextFormatMarkRow2,
            });
        }
        if (orig.appendTextFormatMark) {
            settings.groups[DEFAULT_NAME].appendDateFormat =
                orig.appendTextFormatMark;
        }
        if (orig.appendTextFormatAppend) {
            createSettingsGroup(settings.groups, TEXT_ONLY_NAME, {
                marks: TEXT_ONLY_MARK,
                appendDateFormat: orig.appendTextFormatAppend,
                useContextMenu: orig.rightClickAppend,
            });
        }
        tcp.tc.logDebug("groups", settings.groups);

        // Task Marker default
        settings.collectionEnabled = false;
    }

    // Task collection
    if (settings.collectionEnabled) {
        settings.groups[COMPLETE_NAME].collection = {
            areaHeading: old.completedAreaHeader,
            removeCheckbox: old.completedAreaRemoveCheckbox,
        };
    }

    // Save modified config
    settings.version = toVersion(tcp.manifest.version);
    tcp.tc.logDebug("migrated settings", settings);
    await tcp.saveData(settings);
    return settings as TaskCollectorSettings;
}

function createSettingsGroup(
    groups: Record<string, ManipulationSettings>,
    name: string,
    data: Partial<ManipulationSettings>,
): void {
    groups[name] = {
        ...GROUP_DEFAULT,
        name,
        ...data,
    };
    if (groups[name].marks === "") {
        groups[name].marks = TEXT_ONLY_MARK;
    }
}

function toVersion(version: string): TcVersion {
    const v = version.split(".");
    return {
        major: Number(v[0]),
        minor: Number(v[1]),
        patch: Number(v[2]),
    };
}

function compareVersion(v1: TcVersion, v2: TcVersion): number {
    if (v1.major === v2.major) {
        if (v1.minor === v2.minor) {
            return v1.patch - v2.patch;
        }
        return v1.minor - v2.minor;
    }
    return v1.major - v2.major;
}

function hasMark(group: ManipulationSettings) {
    return group && group.marks !== "" && group.marks !== TEXT_ONLY_MARK;
}

function moveGroup(
    groups: Record<string, ManipulationSettings>,
    oldName: string,
    newName: string,
) {
    if (!groups || !oldName || !newName || newName === oldName) {
        return;
    }
    if (groups[newName]) {
        console.warn(`(TC) Can not move group, ${newName} already exists`);
    } else {
        groups[oldName].name = newName;
        groups[newName] = groups[oldName];
        delete groups[oldName];
    }
}

function nextRandom(used: string): string[] {
    let next = used;
    let i = 0;
    do {
        const mark = String.fromCharCode(
            0x2654 + Math.random() * (0x2667 - 0x2654 + 1),
        );
        if (next.indexOf(mark) < 0) {
            next += mark;
            return [next, mark];
        }
        i++;
    } while (i < 10);
    return [next, String.fromCharCode(0x24e7)];
}
