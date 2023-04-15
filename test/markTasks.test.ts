import { Direction, TaskCollector } from "../src/taskcollector-TaskCollector";
import { TaskCollectorSettings } from "../src/@types/settings";
import * as Moment from 'moment';
import { COMPLETE_NAME, DEFAULT_COLLECTION, DEFAULT_NAME, DEFAULT_SETTINGS, GROUP_COMPLETE, GROUP_DEFAULT } from "../src/taskcollector-Constants";

jest.mock('obsidian', () => ({
    App: jest.fn().mockImplementation(),
    moment: () => Moment()
}));

let tc = new TaskCollector();
let config: TaskCollectorSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

afterEach(() => {
    tc = new TaskCollector();
    config =  JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
});

test('Test default settings', () => {
    tc.init(config);

    expect(tc.cache.removeExpr[COMPLETE_NAME]).toBeUndefined();
    expect(tc.cache.undoExpr[COMPLETE_NAME]).toBeUndefined();

    expect(tc.updateLineText('- [ ] something', 'x')).toEqual('- [x] something');
    expect(tc.updateLineText('- [x] something', '-')).toEqual('- [-] something');
    expect(tc.updateLineText('- [-] something', '>')).toEqual('- [>] something');
    expect(tc.updateLineText('- [>] something', ' ')).toEqual('- [ ] something');
});

test('Correctly mark items in a selection', () => {
    tc.init(config);

    const start = "- [ ] one\n- [>] two\n- [-] three\n- [x] four";
    expect(tc.markSelectedTask(start, 'x', [0, 1, 2, 3])).toEqual("- [x] one\n- [x] two\n- [x] three\n- [x] four");
    expect(tc.markSelectedTask(start, '-', [0, 1, 2, 3])).toEqual("- [-] one\n- [-] two\n- [-] three\n- [-] four");
    expect(tc.markSelectedTask(start, '>', [0, 1, 2, 3])).toEqual("- [>] one\n- [>] two\n- [>] three\n- [>] four");
    expect(tc.markSelectedTask(start, ' ', [0, 1, 2, 3])).toEqual("- [ ] one\n- [ ] two\n- [ ] three\n- [ ] four");
});

test('Remove checkbox from line with backspace from modal', () => {
    config.groups[COMPLETE_NAME].collection = Object.assign({}, DEFAULT_COLLECTION);
    config.groups[COMPLETE_NAME].collection.removeCheckbox = true;
    tc.init(config);

    const completed = '- [x] something [x]';
    const incomplete = '- [ ] something [x]';
    const listItem = '- something [x]';
    expect(tc.updateLineText(completed, "Backspace")).toEqual(listItem);
    expect(tc.updateLineText(incomplete, "Backspace")).toEqual(listItem);
});

test('Create and Mark a normal list item', () => {
    config.groups[DEFAULT_NAME].marks += '>';
    config.groups[COMPLETE_NAME].marks += '-';
    config.groups[COMPLETE_NAME].removeExpr = "#(task|todo)";
    tc.init(config);

    const start = "- one #task";
    expect(tc.markSelectedTask(start, 'x', [0])).toEqual("- [x] one");
    expect(tc.markSelectedTask(start, '-', [0])).toEqual("- [-] one");
    expect(tc.markSelectedTask(start, '>', [0])).toEqual("- [>] one #task");
    expect(tc.markSelectedTask(start, ' ', [0])).toEqual("- [ ] one #task");
});

test('Mark tasks within a callout', () => {
    tc.init(config);

    expect(tc.updateLineText('> - [ ] something', '-')).toEqual('> - [-] something');
    expect(tc.updateLineText('> - [-] something', ' ')).toEqual('> - [ ] something');

    expect(tc.updateLineText('> > - [x] something', 'x')).toEqual('> > - [x] something');
    expect(tc.updateLineText('> > - [x] something', ' ')).toEqual('> > - [ ] something');
});

test('Mark non-task/list lines when convert non-list lines is true', () => {
    config.convertEmptyLines = true;
    tc.init(config);
    expect(tc.updateLineText('something', 'x')).toEqual('- [x] something');
});

test('Use indent for non-task/list lines when convertEmptyLines is true', () => {
    config.convertEmptyLines = true;
    tc.init(config);
    expect(tc.updateLineText('\tsomething', 'x')).toEqual('\t- [x] something');
});

test('Do not mark non-task/list lines when convert non-list lines is false', () => {
    tc.init(config);
    expect(tc.updateLineText('something', '-')).toEqual('something');
});

test('Accomodate callouts for non-task/list lines when convertEmptyLines is true', () => {
    config.convertEmptyLines = true;
    tc.init(config);
    expect(tc.updateLineText('> something', 'x')).toEqual('> - [x] something');
});

test('Mark tasks in a cycle', () => {
    config.markCycle = "abc";
    tc.init(config);
    expect(tc.markInCycle('- [ ] something', Direction.NEXT, [0])).toEqual("- [a] something");
    expect(tc.markInCycle('- [a] something', Direction.NEXT, [0])).toEqual("- [b] something");
    expect(tc.markInCycle('- [b] something', Direction.NEXT, [0])).toEqual("- [c] something");
    expect(tc.markInCycle('- [c] something', Direction.NEXT, [0])).toEqual("- [a] something");

    expect(tc.markInCycle('- [ ] something', Direction.PREV, [0])).toEqual("- [c] something");
    expect(tc.markInCycle('- [a] something', Direction.PREV, [0])).toEqual("- [c] something");
    expect(tc.markInCycle('- [b] something', Direction.PREV, [0])).toEqual("- [a] something");
    expect(tc.markInCycle('- [c] something', Direction.PREV, [0])).toEqual("- [b] something");
});

test('Mark lines as tasks in a cycle', () => {
    config.markCycle = "abc";
    tc.init(config);
    expect(tc.markInCycle('- something', Direction.NEXT, [0])).toEqual("- [a] something");
    expect(tc.markInCycle('- something', Direction.PREV, [0])).toEqual("- [c] something");
});


