export interface TaskCollectorSettings {
    completedAreaHeader: string;
    removeExpression: string;
    appendDateFormat: string;
    incompleteTaskValues: string;
    supportCanceledTasks: boolean;
    rightClickComplete: boolean;
    rightClickMove: boolean;
    rightClickToggleAll: boolean
}

export const DEFAULT_SETTINGS: TaskCollectorSettings = {
    completedAreaHeader: '## Log',
    removeExpression: '',
    appendDateFormat: '',
    incompleteTaskValues: '',
    supportCanceledTasks: false,
    rightClickComplete: false,
    rightClickMove: false,
    rightClickToggleAll: false
}

export interface CompiledTasksSettings {
    removeRegExp: RegExp;
    resetRegExp: RegExp;
    incompleteTaskRegExp: RegExp;
}

