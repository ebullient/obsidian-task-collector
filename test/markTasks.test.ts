import { App } from "obsidian";
import { TaskCollector } from "../src/taskcollector-TaskCollector";
import { DEFAULT_SETTINGS, TaskCollectorSettings } from "../src/taskcollector-Settings";
import * as Moment from 'moment';

jest.mock('obsidian', () => ({
    App: jest.fn().mockImplementation(),
    moment: () => Moment()
}));

const config: TaskCollectorSettings = Object.assign({}, DEFAULT_SETTINGS);;

afterEach(() => {
    // reset config to defaults
    Object.assign(config, DEFAULT_SETTINGS);
});

test('Test default settings', () => {
    const tc = new TaskCollector(new App());
    tc.updateSettings(config);

    expect(tc.initSettings.removeRegExp).toBeNull();
    expect(tc.initSettings.resetRegExp).toBeNull();

    expect('- [ ] ').toMatch(tc.initSettings.incompleteTaskRegExp);
    expect('- [>] ').not.toMatch(tc.initSettings.incompleteTaskRegExp);

    expect('- [x] ').toMatch(tc.initSettings.completedTaskRegExp);
    expect('- [X] ').toMatch(tc.initSettings.completedTaskRegExp);
    expect('- [-] ').toMatch(tc.initSettings.completedTaskRegExp);

    expect(tc.markTaskLine('- [ ] something', 'x')).toEqual('- [x] something');
    expect(tc.markTaskLine('- [>] something', 'x')).toEqual('- [>] something'); // "complete" (with something unknown)
    expect(tc.markTaskLine('- [-] something', 'x')).toEqual('- [-] something'); // already "complete"
    expect(tc.markTaskLine('- [x] something', 'X')).toEqual('- [x] something'); // already "complete"
    expect(tc.markTaskLine('- [X] something', ' ')).toEqual('- [ ] something');
    expect(tc.markTaskLine('- [x] something', ' ')).toEqual('- [ ] something');
    expect(tc.markTaskLine('- [>] something', ' ')).toEqual('- [ ] something'); // always reset
    expect(tc.markTaskLine('- [-] something', ' ')).toEqual('- [ ] something'); // always reset
});

test('Complete > when included in incomplete pattern', () => {
    const tc = new TaskCollector(new App());
    config.incompleteTaskValues = ' >';
    tc.updateSettings(config);

    expect(tc.initSettings.removeRegExp).toBeNull();
    expect(tc.initSettings.resetRegExp).toBeNull();

    expect('- [>] ').toMatch(tc.initSettings.incompleteTaskRegExp);

    expect(tc.markTaskLine('- [>] something', 'x')).toEqual('- [x] something');
    expect(tc.markTaskLine('- [>] something', ' ')).toEqual('- [ ] something');
});

test('- behaves like completed item when cancelled items are enabled', () => {
    const tc = new TaskCollector(new App());
    config.supportCanceledTasks = true;
    tc.updateSettings(config);

    expect(tc.initSettings.completedTaskRegExp).not.toBeNull();
    expect('- [-] ').not.toMatch(tc.initSettings.incompleteTaskRegExp);
    expect('- [-] ').toMatch(tc.initSettings.completedTaskRegExp);

    expect(tc.markTaskLine('- [ ] something', '-')).toEqual('- [-] something');
    expect(tc.markTaskLine('- [-] something', 'x')).toEqual('- [-] something');
    expect(tc.markTaskLine('- [x] something', '-')).toEqual('- [x] something');
    expect(tc.markTaskLine('- [-] something', ' ')).toEqual('- [ ] something');
});

test('Test with empty incomplete pattern', () => {
    const tc = new TaskCollector(new App());
    config.incompleteTaskValues = '';
    tc.updateSettings(config);

    expect(tc.markTaskLine('- [ ] something', 'x')).toEqual('- [x] something');
    expect(tc.markTaskLine('- [>] something', 'x')).toEqual('- [>] something'); // already "complete"
    expect(tc.markTaskLine('- [-] something', 'x')).toEqual('- [-] something'); // already "complete"
    expect(tc.markTaskLine('- [x] something', 'X')).toEqual('- [x] something'); // already "complete"
    expect(tc.markTaskLine('- [X] something', ' ')).toEqual('- [ ] something');
    expect(tc.markTaskLine('- [x] something', ' ')).toEqual('- [ ] something');
    expect(tc.markTaskLine('- [>] something', ' ')).toEqual('- [ ] something');
    expect(tc.markTaskLine('- [-] something', ' ')).toEqual('- [ ] something');
});

test('Correctly mark complete or incomplete items in a selection', () => {
    const tc = new TaskCollector(new App());
    config.incompleteTaskValues = ' >';
    config.supportCanceledTasks = true;
    config.removeExpression = "#(task|todo)";
    tc.updateSettings(config);

    const start = "- [ ] one\n- [>] two\n- [-] three\n- [x] four";
    expect(tc.markTaskInSource(start, 'x', [0, 1, 2, 3])).toEqual("- [x] one\n- [x] two\n- [-] three\n- [x] four");
    expect(tc.markTaskInSource(start, '-', [0, 1, 2, 3])).toEqual("- [-] one\n- [-] two\n- [-] three\n- [x] four");
    expect(tc.markTaskInSource(start, '>', [0, 1, 2, 3])).toEqual("- [>] one\n- [>] two\n- [>] three\n- [>] four");
    expect(tc.markTaskInSource(start, ' ', [0, 1, 2, 3])).toEqual("- [ ] one\n- [ ] two\n- [ ] three\n- [ ] four");
});

test('Remove checkbox from line', () => {
    const tc = new TaskCollector(new App());
    config.completedAreaRemoveCheckbox = true;
    tc.updateSettings(config);

    const completed = '- [x] something [x]';
    const canceled = '- [-] something [x]';
    const incomplete = '- [ ] something [x]';
    const listItem = '- something [x]';
    expect(tc.markTaskLine(completed, "Backspace")).toEqual(listItem);
    expect(tc.markTaskLine(canceled, "Backspace")).toEqual(listItem);
    expect(tc.markTaskLine(incomplete, "Backspace")).toEqual(listItem);
});

test('Create and Mark a normal list item', () => {
    const tc = new TaskCollector(new App());
    config.supportCanceledTasks = true;
    config.incompleteTaskValues = ' >';
    config.removeExpression = "#(task|todo)";
    tc.updateSettings(config);

    const start = "- one #task";
    expect(tc.markTaskInSource(start, 'x', [0])).toEqual("- [x] one ");
    expect(tc.markTaskInSource(start, '-', [0])).toEqual("- [-] one ");
    expect(tc.markTaskInSource(start, '>', [0])).toEqual("- [>] one #task");
    expect(tc.markTaskInSource(start, ' ', [0])).toEqual("- [ ] one #task");
});

test('Mark tasks within a callout', () => {
    const tc = new TaskCollector(new App());
    config.supportCanceledTasks = true;
    tc.updateSettings(config);

    expect(tc.markTaskLine('> - [ ] something', '-')).toEqual('> - [-] something');
    expect(tc.markTaskLine('> - [-] something', ' ')).toEqual('> - [ ] something');

    expect(tc.markTaskLine('> > - [x] something', 'x')).toEqual('> > - [x] something');
    expect(tc.markTaskLine('> > - [x] something', ' ')).toEqual('> > - [ ] something');
});
