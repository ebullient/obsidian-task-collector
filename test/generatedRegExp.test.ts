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
    expect('- [-] ').not.toMatch(tc.initSettings.completedTaskRegExp);

    expect(tc.completeTaskLine('- [ ] something', 'x')).toEqual('- [x] something');
    expect(tc.completeTaskLine('- [>] something', 'x')).toEqual('- [>] something'); // already "complete"
    expect(tc.completeTaskLine('- [-] something', 'x')).toEqual('- [-] something'); // already "complete"
    expect(tc.completeTaskLine('- [x] something', 'X')).toEqual('- [x] something'); // already "complete"
    expect(tc.resetTaskLine('- [X] something', ' ')).toEqual('- [ ] something');
    expect(tc.resetTaskLine('- [x] something', ' ')).toEqual('- [ ] something');
    expect(tc.resetTaskLine('- [>] something', ' ')).toEqual('- [ ] something');
    expect(tc.resetTaskLine('- [-] something', ' ')).toEqual('- [ ] something');
});

test('Complete > when included in incomplete pattern', () => {
    const tc = new TaskCollector(new App());
    config.incompleteTaskValues = ' >';
    tc.updateSettings(config);

    expect(tc.initSettings.removeRegExp).toBeNull();
    expect(tc.initSettings.resetRegExp).toBeNull();

    expect('- [>] ').toMatch(tc.initSettings.incompleteTaskRegExp);

    expect(tc.completeTaskLine('- [>] something', 'x')).toEqual('- [x] something');
    expect(tc.resetTaskLine('- [>] something', ' ')).toEqual('- [ ] something');
});

test('Match - when cancelled items are enabled', () => {
    const tc = new TaskCollector(new App());
    config.supportCanceledTasks = true;
    tc.updateSettings(config);

    expect(tc.initSettings.completedTaskRegExp).not.toBeNull();
    expect('- [-] ').not.toMatch(tc.initSettings.incompleteTaskRegExp);
    expect('- [-] ').toMatch(tc.initSettings.completedTaskRegExp);

    expect(tc.completeTaskLine('- [ ] something', '-')).toEqual('- [-] something');
    expect(tc.completeTaskLine('- [-] something', 'x')).toEqual('- [-] something');
    expect(tc.completeTaskLine('- [x] something', '-')).toEqual('- [x] something');
    expect(tc.resetTaskLine('- [-] something', ' ')).toEqual('- [ ] something');
});


test('Match specified removal patterns', () => {
    const tc = new TaskCollector(new App());
    config.incompleteTaskValues = ' >';
    config.removeExpression = "#(task|todo)";
    tc.updateSettings(config);

    expect('- [x] something #todo').toMatch(tc.initSettings.removeRegExp);
    expect('- [x] something #task').toMatch(tc.initSettings.removeRegExp);
    expect('- [x] something #task #todo').toMatch(tc.initSettings.removeRegExp);
    expect('- [x] something else').not.toMatch(tc.initSettings.removeRegExp);

    expect(tc.completeTaskLine('- [ ] something #todo', 'x')).toEqual('- [x] something ');
    expect(tc.completeTaskLine('- [>] something #todo', 'x')).toEqual('- [x] something ');
    expect(tc.resetTaskLine('- [x] something #todo', ' ')).toEqual('- [ ] something #todo');
    expect(tc.resetTaskLine('- [>] something #todo', ' ')).toEqual('- [ ] something #todo');
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
    expect(tc.removeCheckboxFromLine(completed)).toEqual(listItem);
    expect(tc.removeCheckboxFromLine(canceled)).toEqual(listItem);
    expect(tc.removeCheckboxFromLine(incomplete)).toEqual(listItem);
});

test('Move completed items to archive area', () => {
    const tc = new TaskCollector(new App());
    config.supportCanceledTasks = true;
    tc.updateSettings(config);

    const start = "- [ ] one\n- [>] two\n- [-] three\n- [x] four";
    expect(tc.moveCompletedTasksInFile(start)).toEqual("- [ ] one\n- [>] two\n\n## Log\n- [-] three\n- [x] four");
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

describe('Set an append date', () => {
    test('YYYY-MM-DD append string', () => {
        const tc = new TaskCollector(new App());
        config.appendDateFormat = 'YYYY-MM-DD';
        tc.updateSettings(config);

        // raw settings
        expect('- [x] something 2021-08-24').toMatch(tc.initSettings.resetRegExp);

        expect('- [x] something (2021-08-24)').not.toMatch(tc.initSettings.resetRegExp);
        expect('- [x] 2021-08-24 something else').not.toMatch(tc.initSettings.resetRegExp);

        const completed = tc.completeTaskLine('- [ ] something #todo', 'x');
        expect(completed).toMatch(tc.initSettings.resetRegExp);
        expect(tc.resetTaskLine(completed)).toEqual('- [ ] something #todo');
    });

    test('(YYYY-MM-DD) append string', () => {
        const tc = new TaskCollector(new App());
        config.appendDateFormat = '[(]YYYY-MM-DD[)]';
        tc.updateSettings(config);

        expect('- [x] something (2021-08-24)').toMatch(tc.initSettings.resetRegExp);

        expect('- [x] something 2021-08-24').not.toMatch(tc.initSettings.resetRegExp);
        expect('- [x] 2021-08-24 something else').not.toMatch(tc.initSettings.resetRegExp);

        const completed = tc.completeTaskLine('- [ ] something #todo', 'x');
        expect(completed).toMatch(tc.initSettings.resetRegExp);
        expect(tc.resetTaskLine(completed)).toEqual('- [ ] something #todo');
    });

    test('(D MMM, YYYY) append string', () => {
        const tc = new TaskCollector(new App());
        config.appendDateFormat = '[(]D MMM, YYYY[)]';
        tc.updateSettings(config);

        expect('- [x] something (6 Oct, 2021)').toMatch(tc.initSettings.resetRegExp);

        expect('- [x] something 6 Oct, 2021').not.toMatch(tc.initSettings.resetRegExp);
        expect('- [x] 6 Oct, 2021, something else').not.toMatch(tc.initSettings.resetRegExp);
        expect('- [x] 2021-10-06 something else').not.toMatch(tc.initSettings.resetRegExp);

        const completed = tc.completeTaskLine('- [ ] something #todo', 'x');
        expect(completed).toMatch(tc.initSettings.resetRegExp);
        expect(tc.resetTaskLine(completed)).toEqual('- [ ] something #todo');
    });

    test('DD MMM, YYYY append string', () => {
        const tc = new TaskCollector(new App());
        config.appendDateFormat = 'DD MMM, YYYY';
        tc.updateSettings(config);

        expect('- [x] something 06 Oct, 2021').toMatch(tc.initSettings.resetRegExp);

        expect('- [x] something (6 Oct, 2021)').not.toMatch(tc.initSettings.resetRegExp);
        expect('- [x] something 6 Oct, 2021').not.toMatch(tc.initSettings.resetRegExp);
        expect('- [x] 6 Oct, 2021, something else').not.toMatch(tc.initSettings.resetRegExp);
        expect('- [x] 2021-10-06 something else').not.toMatch(tc.initSettings.resetRegExp);

        const completed = tc.completeTaskLine('- [ ] something #todo', 'x');
        expect(completed).toMatch(tc.initSettings.resetRegExp);
        expect(tc.resetTaskLine(completed)).toEqual('- [ ] something #todo');
    });

    test('[(completed on ]D MMM, YYYY[)] append string', () => {
        const tc = new TaskCollector(new App());
        config.appendDateFormat = '[(completed on ]D MMM, YYYY[)]';
        tc.updateSettings(config);

        expect('- [x] something (completed on 6 Oct, 2021)').toMatch(tc.initSettings.resetRegExp);

        expect('- [x] something (6 Oct, 2021)').not.toMatch(tc.initSettings.resetRegExp);
        expect('- [x] something 6 Oct, 2021').not.toMatch(tc.initSettings.resetRegExp);
        expect('- [x] 6 Oct, 2021, something else').not.toMatch(tc.initSettings.resetRegExp);
        expect('- [x] 2021-10-06 something else').not.toMatch(tc.initSettings.resetRegExp);

        const completed = tc.completeTaskLine('- [ ] something #todo', 'x');
        expect(completed).toMatch(tc.initSettings.resetRegExp);
        expect(tc.resetTaskLine(completed)).toEqual('- [ ] something #todo');
    });

    test('[✅ ]YYYY-MM-DDTHH:mm append string', () => {
        const tc = new TaskCollector(new App());
        config.appendDateFormat = '[✅ ]YYYY-MM-DDTHH:mm';
        tc.updateSettings(config);

        expect('- [x] something ✅ 2021-10-07T13:55').toMatch(tc.initSettings.resetRegExp);

        expect('- [x] something (6 Oct, 2021)').not.toMatch(tc.initSettings.resetRegExp);
        expect('- [x] something 6 Oct, 2021').not.toMatch(tc.initSettings.resetRegExp);
        expect('- [x] 6 Oct, 2021, something else').not.toMatch(tc.initSettings.resetRegExp);
        expect('- [x] 2021-10-06 something else').not.toMatch(tc.initSettings.resetRegExp);

        const completed = tc.completeTaskLine('- [ ] something #todo', 'x');
        expect(completed).toMatch(tc.initSettings.resetRegExp);
        expect(tc.resetTaskLine(completed)).toEqual('- [ ] something #todo');
    });

    test('Dataview annotated string [completion::2021-08-15]', () => {
        const tc = new TaskCollector(new App());
        config.appendDateFormat = '[[completion::]YYYY-MM-DD[]]';
        tc.updateSettings(config);

        expect('- [x] I finished this on [completion::2021-08-15]').toMatch(tc.initSettings.resetRegExp);

        expect('- [x] something (6 Oct, 2021)').not.toMatch(tc.initSettings.resetRegExp);
        expect('- [x] something 6 Oct, 2021').not.toMatch(tc.initSettings.resetRegExp);
        expect('- [x] 6 Oct, 2021, something else').not.toMatch(tc.initSettings.resetRegExp);
        expect('- [x] 2021-10-06 something else').not.toMatch(tc.initSettings.resetRegExp);

        const completed = tc.completeTaskLine('- [ ] something #todo', 'x');
        expect(completed).toMatch(tc.initSettings.resetRegExp);
        expect(tc.resetTaskLine(completed)).toEqual('- [ ] something #todo');
    });

    test('Correctly insert annotation ahead of block reference', () => {
        const tc = new TaskCollector(new App());
        config.appendDateFormat = '[[completion::]YYYY-MM-DD[]]';
        tc.updateSettings(config);

        expect('- [ ] something (6 Oct, 2021) ^your-ID-1').toMatch(tc.blockRef);
        expect('- [x] I finished this on [completion::2021-08-15] ^your-ID-1').toMatch(tc.blockRef);

        expect('- [ ] something (6 Oct, 2021) ^your-ID-1').toMatch(tc.initSettings.incompleteTaskRegExp);
        expect('- [x] I finished this on [completion::2021-08-15] ^your-ID-1').toMatch(tc.initSettings.resetRegExp);

        const completed = tc.completeTaskLine('- [ ] something #todo ^your-ID-1', 'x');
        expect(completed).toMatch(/- \[x\] something #todo \[completion::\d+-\d+-\d+\] \^your-ID-1/);
        expect(completed).toMatch(tc.initSettings.resetRegExp);
        expect(tc.resetTaskLine(completed)).toEqual('- [ ] something #todo ^your-ID-1');
    });
});

