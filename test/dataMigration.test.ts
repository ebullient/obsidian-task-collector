import { App, type PluginManifest } from "obsidian";
import type { TaskCollectorSettings } from "../src/@types/settings";
import {
    COMPLETE_NAME,
    DEFAULT_NAME,
    DEFAULT_SETTINGS_0,
    GROUP_COMPLETE,
    GROUP_DEFAULT,
    TEXT_ONLY_MARK,
} from "../src/taskcollector-Constants";
import { Data } from "../src/taskcollector-Data";
import { TaskCollectorPlugin } from "../src/taskcollector-Plugin";
import { TaskCollector } from "../src/taskcollector-TaskCollector";

const MANIFEST: PluginManifest = {
    id: "obsidian-task-collector",
    name: "Task Collector (TC)",
    author: "",
    version: "1.0.0",
    minAppVersion: "",
    description: "",
};

jest.mock("obsidian", () => ({
    App: jest.fn().mockImplementation(),
    Plugin: jest.fn().mockImplementation(() => {
        return {
            manifest: MANIFEST,
            saveData: () => Promise.resolve(),
            // debug: (message: string, ...optionalParams: any[]) => {
            //     console.debug(message, ...optionalParams); // tests
            // }
        };
    }),
    PluginSettingTab: jest.fn().mockImplementation(),
    Modal: jest.fn().mockImplementation(),
}));

const plugin = new TaskCollectorPlugin(new App(), MANIFEST);
plugin.tc = new TaskCollector();

const DEFAULT_MIGRATION = {
    groups: {
        default: {
            name: DEFAULT_NAME,
            marks: " ",
            complete: false,
            removeExpr: "",
            appendDateFormat: "",
            registerCommand: false,
            useContextMenu: false,
        },
        complete: {
            name: COMPLETE_NAME,
            marks: "-Xx",
            complete: true,
            removeExpr: "",
            appendDateFormat: "",
            registerCommand: false,
            useContextMenu: false,
            collection: {
                areaHeading: "## Log",
                removeCheckbox: false,
            },
        },
    },
    markCycle: "",
    markCycleRemoveTask: false,
    collectionEnabled: true,
    previewClickModal: false,
    contextMenu: {
        markTask: false,
        resetTask: false,
        resetAllTasks: false,
        collectTasks: false,
    },
    debug: false,
    convertEmptyLines: false,
    hideNotifications: false,
    skipSectionMatch: "",
    version: {
        major: 1,
        minor: 0,
        patch: 0,
    },
};

test("Migration: defaults", async () => {
    const settings = await Data.constructSettings(plugin, DEFAULT_SETTINGS_0);
    expect(settings).toEqual(DEFAULT_MIGRATION);
});

test("Migration: appendReplace all", async () => {
    const initial = Object.assign({}, DEFAULT_SETTINGS_0, {
        appendDateFormat: "[(completed on ]D MMM, YYYY[)]",
        removeExpression: "#done",
        appendRemoveAllTasks: true,
    });

    const expected: TaskCollectorSettings = JSON.parse(
        JSON.stringify(DEFAULT_MIGRATION),
    );
    expected.groups[COMPLETE_NAME].appendDateFormat =
        "[(completed on ]D MMM, YYYY[)]";
    expected.groups[DEFAULT_NAME].appendDateFormat =
        "[(completed on ]D MMM, YYYY[)]";
    expected.groups[COMPLETE_NAME].removeExpr = "#done";
    expected.groups[DEFAULT_NAME].removeExpr = "#done";

    const settings = await Data.constructSettings(plugin, initial);
    expect(settings).toEqual(expected);
});

test("Task Marker: User configuration", async () => {
    const initial = {
        removeExpression: "",
        appendDateFormat: "",
        appendTextFormatMark: "",
        appendTextFormatMarkRow2: "",
        appendTextFormatCreation: "",
        appendTextFormatAppend: " YYYY-MM-DD",
        appendRemoveAllTasks: false,
        incompleteTaskValues: " /ib?>",
        incompleteTaskValuesRow2: "I!",
        cycleTaskValues: " x/>-",
        onlyLowercaseX: false,
        supportCanceledTasks: true,
        previewOnClick: false,
        rightClickComplete: true,
        rightClickMark: true,
        rightClickCycle: true,
        rightClickCreate: true,
        rightClickAppend: true,
        rightClickResetTask: false,
        rightClickResetAll: false,
        rightClickToggleAll: false,
    };

    const expected: TaskCollectorSettings = Object.assign(
        {},
        JSON.parse(JSON.stringify(DEFAULT_MIGRATION)),
        {
            markCycle: " x/>-",
            markCycleRemoveTask: false,
            previewClickModal: false,
            collectionEnabled: false,
            contextMenu: {
                markTask: true,
                collectTasks: false,
                resetTask: false,
                resetAllTasks: false,
            },
            groups: {
                default: {
                    ...GROUP_DEFAULT,
                    marks: " />?bi",
                },
                complete: {
                    ...GROUP_COMPLETE,
                    marks: "-Xx",
                    useContextMenu: true,
                },
                "group-2": {
                    ...GROUP_DEFAULT,
                    name: "group-2",
                    marks: "!I",
                },
                text: {
                    ...GROUP_DEFAULT,
                    name: "text",
                    marks: TEXT_ONLY_MARK,
                    appendDateFormat: " YYYY-MM-DD",
                    useContextMenu: true,
                },
            },
        },
    );

    console.log(expected);

    const settings = await Data.constructSettings(plugin, initial);
    expect(settings).toEqual(expected);
});
