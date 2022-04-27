export interface TaskCollectorSettings {
    completedAreaHeader: string;
    removeExpression: string;
    appendDateFormat: string;
    appendRemoveAllTasks: boolean;
    incompleteTaskValues: string;
    supportCanceledTasks: boolean;
    previewOnClick: boolean;
    rightClickComplete: boolean;
    rightClickMark: boolean;
    rightClickMove: boolean;
    rightClickResetTask: boolean;
    rightClickResetAll: boolean;
    rightClickToggleAll: boolean;
    completedAreaRemoveCheckbox: boolean;
    onlyLowercaseX: boolean;
}

export const DEFAULT_SETTINGS: TaskCollectorSettings = {
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
export interface CompiledTasksSettings {
    removeRegExp: RegExp;
    resetRegExp: RegExp;
    incompleteTaskRegExp: RegExp;
    rightClickTaskMenu: boolean;
    completedTasks: string;
    completedTaskRegExp: RegExp;
    registerHandlers: boolean;
}
