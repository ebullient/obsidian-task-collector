import {
    ManipulationSettings,
    TaskCollectorCache,
    TaskCollectorSettings,
} from "./@types/settings";

export const TEXT_ONLY_MARK = "Ø";
export const TEXT_ONLY_NAME = "text";
export const DEFAULT_NAME = "default";
export const COMPLETE_NAME = "complete";

export const DEFAULT_SETTINGS: TaskCollectorSettings = {
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
            marks: "xX",
            complete: true,
            removeExpr: "",
            appendDateFormat: "",
            registerCommand: false,
            useContextMenu: false,
        },
    },
    markCycle: "",
    collectionEnabled: false,
    previewClickModal: true,
    contextMenu: {
        markTask: true,
        resetTask: false,
        collectTasks: true,
    },
    debug: false,
    convertEmptyLines: false,
    version: {
        major: 0,
        minor: 0,
        patch: 0,
    },
};

export const GROUP_DEFAULT: ManipulationSettings = {
    name: DEFAULT_NAME,
    marks: "",
    complete: false,
    removeExpr: "",
    appendDateFormat: "",
    registerCommand: false,
    useContextMenu: false,
};

export const GROUP_COMPLETE: ManipulationSettings = {
    name: COMPLETE_NAME,
    marks: "xX",
    complete: true,
    removeExpr: "",
    appendDateFormat: "",
    registerCommand: false,
    useContextMenu: false,
};

export const DEFAULT_COLLECTION = {
    areaHeading: "## Log",
    removeCheckbox: false,
};

export const CACHE_DEFAULT: TaskCollectorCache = {
    useContextMenu: false,
    completedMarks: "",
    // completedTaskRegExp: null,
    incompleteMarks: "",
    // incompleteTaskRegExp: null,
    marks: {},
    removeExpr: {},
    undoExpr: {},
    areaHeadings: [],
    headingToMark: {},
};

export const DEFAULT_SETTINGS_0 = {
    completedAreaHeader: "## Log",
    removeExpression: "",
    appendDateFormat: "",
    appendRemoveAllTasks: false,
    incompleteTaskValues: " ",
    onlyLowercaseX: false,
    supportCanceledTasks: true,
    previewOnClick: false,
    rightClickComplete: false,
    rightClickMark: false,
    rightClickMove: false,
    rightClickResetTask: false,
    rightClickResetAll: false,
    rightClickToggleAll: false,
    completedAreaRemoveCheckbox: false,
};
