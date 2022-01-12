export interface TaskCollectorSettings {
    completedAreaHeader: string;
    removeExpression: string;
    appendDateFormat: string;
    incompleteTaskValues: string;
    supportCanceledTasks: boolean;
    rightClickComplete: boolean;
    rightClickMark: boolean;
    rightClickMove: boolean;
    rightClickResetTask: boolean;
    rightClickResetAll: boolean;
    rightClickToggleAll: boolean;
    completedAreaRemoveCheckbox: boolean;
}

export const DEFAULT_SETTINGS: TaskCollectorSettings = {
    completedAreaHeader: "## Log",
    removeExpression: "",
    appendDateFormat: "",
    incompleteTaskValues: " ",
    supportCanceledTasks: false,
    rightClickComplete: false,
    rightClickMark: false,
    rightClickMove: false,
    rightClickResetTask: false,
    rightClickResetAll: false,
    rightClickToggleAll: false,
    completedAreaRemoveCheckbox: false,
};

export interface CompiledTasksSettings {
    removeRegExp: RegExp;
    resetRegExp: RegExp;
    incompleteTaskRegExp: RegExp;
    rightClickTaskMenu: boolean;
}
