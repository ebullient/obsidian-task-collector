export type TaskCollectorSettings = {
    groups: Record<string, ManipulationSettings>;
    collectionEnabled: boolean;
    previewClickModal: boolean;
    markCycle: string;
    markCycleRemoveTask: boolean;
    skipSectionMatch: string;
    contextMenu: {
        markTask: boolean;
        resetTask: boolean;
        resetAllTasks: boolean;
        collectTasks: boolean;
    };
    debug: boolean;
    convertEmptyLines: boolean;
    hideNotifications: boolean;
    version: TcVersion;
};

export type ManipulationSettings = {
    name: string;
    marks: string;
    complete: boolean;
    removeExpr: string;
    appendDateFormat: string;
    collection?: CollectionSettings;
    registerCommand: boolean;
    useContextMenu: boolean;
};

export type CollectionSettings = {
    areaHeading: string;
    removeCheckbox: boolean;
};

export type TcVersion = {
    major: number;
    minor: number;
    patch: number;
};

export type TaskCollectorCache = {
    useContextMenu: boolean; // task line context menu items
    marks: Record<string, ManipulationSettings>; // (char, settings)
    removeExpr: Record<string, RegExp>; // (settings name, removeTextRegex)
    undoExpr: Record<string, RegExp>; // (settings name, undoRegex)
    skipSectionExpr: RegExp | null;
    completedMarks: string; // marks that should be treated as "complete"
    incompleteMarks: string; // marks that should be treated as "incomplete"
    areaHeadings: string[]; // configured area headings
    headingToMark: Record<string, string>; // heading to string of marks
};

export type LegacySettings = {
    completedAreaHeader?: string;
    removeExpression?: string;
    appendDateFormat?: string;
    appendRemoveAllTasks?: boolean;
    incompleteTaskValues?: string;
    onlyLowercaseX?: boolean;
    supportCanceledTasks?: boolean;
    previewOnClick?: boolean;
    rightClickComplete?: boolean;
    rightClickMark?: boolean;
    rightClickMove?: boolean;
    rightClickResetTask?: boolean;
    rightClickResetAll?: boolean;
    rightClickToggleAll?: boolean;
    completedAreaRemoveCheckbox?: boolean;
    // Task Marker migration fields
    cycleTaskValues?: string;
    incompleteTaskValuesRow2?: string;
    appendTextFormatMarkRow2?: string;
    appendTextFormatMark?: string;
    appendTextFormatAppend?: string;
    rightClickAppend?: boolean;
    version?: TcVersion;
};

export type TcSectionBlock = {
    existing: string[];
    newTasks: string[];
};

export type TcSection = {
    blocks: TcSectionBlock[];
};
