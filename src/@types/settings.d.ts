export type TaskCollectorSettings = {
    groups: Record<string, ManipulationSettings>;
    collectionEnabled: boolean;
    previewClickModal: boolean;
    markCycle: string;
    contextMenu: {
        markTask: boolean;
        resetTask: boolean;
        collectTasks: boolean;
    };
    debug: boolean;
    convertEmptyLines: boolean;
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
    completedMarks: string; // marks that should be treated as "complete"
    incompleteMarks: string; // marks that should be trated as "incomplete"
    areaHeadings: string[]; // configured area headings
    headingToMark: Record<string, string>; // heading to string of marks
};

export type TcSectionBlock = {
    existing: string[];
    newTasks: string[];
};

export type TcSection = {
    blocks: TcSectionBlock[];
};
