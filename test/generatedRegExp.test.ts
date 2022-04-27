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

test('Match blockquotes / callouts', () => {
    const tc = new TaskCollector(new App());
    tc.updateSettings(config);

    expect('> - [x] ').toMatch(tc.initSettings.completedTaskRegExp);
    expect('> > - [x] ').toMatch(tc.initSettings.completedTaskRegExp);
    expect('> - [ ] ').toMatch(tc.initSettings.incompleteTaskRegExp);
    expect('> > - [ ] ').toMatch(tc.initSettings.incompleteTaskRegExp);
});

test('Match only lowercase x', () => {
    const tc = new TaskCollector(new App());
    config.onlyLowercaseX = true;
    tc.updateSettings(config);

    expect('- [x] ').toMatch(tc.initSettings.completedTaskRegExp);
    expect('- [X] ').not.toMatch(tc.initSettings.completedTaskRegExp);
    expect('- [X] ').not.toMatch(tc.initSettings.incompleteTaskRegExp);
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

    expect(tc.markTaskLine('- [ ] something #todo', 'x')).toEqual('- [x] something ');
    expect(tc.markTaskLine('- [>] something #todo', 'x')).toEqual('- [x] something ');
    expect(tc.markTaskLine('- [x] something #todo', ' ')).toEqual('- [ ] something #todo');
    expect(tc.markTaskLine('- [>] something #todo', ' ')).toEqual('- [ ] something #todo');
});

describe('Set an append date', () => {
    test('YYYY-MM-DD append string', () => {
        const tc = new TaskCollector(new App());
        config.appendDateFormat = 'YYYY-MM-DD';
        tc.updateSettings(config);

        // raw settings
        expect('- [x] something 2021-08-24').toMatch(tc.initSettings.resetRegExp);
        expect('- [x] something   2021-08-24  ').toMatch(tc.initSettings.resetRegExp); // extra whitespace shouldn't matter

        expect('- [x] something (2021-08-24)').not.toMatch(tc.initSettings.resetRegExp);
        expect('- [x] 2021-08-24 something else').not.toMatch(tc.initSettings.resetRegExp);

        const completed = tc.markTaskLine('- [ ] something #todo', 'x');
        expect(completed).toMatch(tc.initSettings.resetRegExp);
        expect(tc.markTaskLine(completed, ' ')).toEqual('- [ ] something #todo');
    });

    test('(YYYY-MM-DD) append string', () => {
        const tc = new TaskCollector(new App());
        config.appendDateFormat = '[(]YYYY-MM-DD[)]';
        tc.updateSettings(config);

        expect('- [x] something (2021-08-24)').toMatch(tc.initSettings.resetRegExp);

        expect('- [x] something 2021-08-24').not.toMatch(tc.initSettings.resetRegExp);
        expect('- [x] 2021-08-24 something else').not.toMatch(tc.initSettings.resetRegExp);

        const completed = tc.markTaskLine('- [ ] something #todo', 'x');
        expect(completed).toMatch(tc.initSettings.resetRegExp);
        expect(tc.markTaskLine(completed, ' ')).toEqual('- [ ] something #todo');
    });

    test('(D MMM, YYYY) append string', () => {
        const tc = new TaskCollector(new App());
        config.appendDateFormat = '[(]D MMM, YYYY[)]';
        tc.updateSettings(config);

        expect('- [x] something (6 Oct, 2021)').toMatch(tc.initSettings.resetRegExp);

        expect('- [x] something 6 Oct, 2021').not.toMatch(tc.initSettings.resetRegExp);
        expect('- [x] 6 Oct, 2021, something else').not.toMatch(tc.initSettings.resetRegExp);
        expect('- [x] 2021-10-06 something else').not.toMatch(tc.initSettings.resetRegExp);

        const completed = tc.markTaskLine('- [ ] something #todo', 'x');
        expect(completed).toMatch(tc.initSettings.resetRegExp);
        expect(tc.markTaskLine(completed, ' ')).toEqual('- [ ] something #todo');
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

        const completed = tc.markTaskLine('- [ ] something #todo', 'x');
        expect(completed).toMatch(tc.initSettings.resetRegExp);
        expect(tc.markTaskLine(completed, ' ')).toEqual('- [ ] something #todo');
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

        const completed = tc.markTaskLine('- [ ] something #todo', 'x');
        expect(completed).toMatch(tc.initSettings.resetRegExp);
        expect(tc.markTaskLine(completed, ' ')).toEqual('- [ ] something #todo');
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

        const completed = tc.markTaskLine('- [ ] something #todo', 'x');
        expect(completed).toMatch(tc.initSettings.resetRegExp);
        expect(tc.markTaskLine(completed, ' ')).toEqual('- [ ] something #todo');
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

        const completed = tc.markTaskLine('- [ ] something #todo', 'x');
        expect(completed).toMatch(tc.initSettings.resetRegExp);
        expect(tc.markTaskLine(completed, ' ')).toEqual('- [ ] something #todo');
    });

    test('Correctly insert annotation ahead of block reference', () => {
        const tc = new TaskCollector(new App());
        config.appendDateFormat = '[[completion::]YYYY-MM-DD[]]';
        tc.updateSettings(config);

        expect('- [ ] something (6 Oct, 2021) ^your-ID-1').toMatch(tc.blockRef);
        expect('- [x] I finished this on [completion::2021-08-15] ^your-ID-1').toMatch(tc.blockRef);

        expect('- [ ] something (6 Oct, 2021) ^your-ID-1').toMatch(tc.initSettings.incompleteTaskRegExp);
        expect('- [x] I finished this on [completion::2021-08-15] ^your-ID-1').toMatch(tc.initSettings.resetRegExp);

        const completed = tc.markTaskLine('- [ ] something #todo ^your-ID-1', 'x');
        expect(completed).toMatch(/- \[x\] something #todo \[completion::\d+-\d+-\d+\] \^your-ID-1/);
        expect(completed).toMatch(tc.initSettings.resetRegExp);
        expect(tc.markTaskLine(completed, ' ')).toEqual('- [ ] something #todo ^your-ID-1');
    });

    test('Preserve continuation with strict line-break', () => {
        const tc = new TaskCollector(new App());
        config.appendDateFormat = '[(]YYYY-MM-DD[)]';
        tc.updateSettings(config);

        const completed = tc.markTaskLine('- [ ] something  ', 'x');
        expect(completed).toMatch(/- \[x\] something  \(\d+-\d+-\d+\)  /);
    });

    test('Preserve continuation with strict line-break across reset', () => {
        const tc = new TaskCollector(new App());
        config.appendDateFormat = '[(]YYYY-MM-DD[)]';
        config.appendRemoveAllTasks = true;
        config.incompleteTaskValues = '>';
        tc.updateSettings(config);

        const completed = tc.markTaskLine('- [ ] something  ', 'x');
        expect(completed).toMatch(tc.initSettings.resetRegExp);
        expect(completed).toMatch(/^- \[x\] something\s+\(\d+-\d+-\d+\)  $/);

        const forwarded = tc.markTaskLine(completed, '>');
        expect(forwarded).toMatch(tc.initSettings.resetRegExp);
        expect(forwarded).toMatch(/^- \[>\] something\s+\(\d+-\d+-\d+\)  $/);

        expect(tc.markTaskLine(forwarded, 'x')).toMatch(/^- \[x\] something\s+\(\d+-\d+-\d+\)  $/);
    });
});

test('Apply text stripping/reset rules to all tasks', () => {
    const tc = new TaskCollector(new App());
    config.appendDateFormat = '[(]YYYY-MM-DD[)]';
    config.removeExpression = "#(task|todo)";
    config.incompleteTaskValues = '>';
    config.appendRemoveAllTasks = true;
    tc.updateSettings(config);

    const completed = tc.markTaskLine('- [ ] something #todo', 'x');
    expect(completed).not.toMatch(tc.initSettings.removeRegExp);
    expect(completed).toMatch(tc.initSettings.resetRegExp);
    expect(completed).toMatch(/^- \[x\] something \(\d+-\d+-\d+\)$/);

    const changed = tc.markTaskLine('- [x] something #todo  (2022-04-26)', '>');
    expect(changed).not.toMatch(tc.initSettings.removeRegExp);
    expect(changed).toMatch(tc.initSettings.resetRegExp);
    expect(changed).toMatch(/^- \[>\] something\s+\(\d+-\d+-\d+\)$/);

    expect(tc.markTaskLine(changed, 'x')).toEqual(completed);
    expect(tc.markTaskLine(changed, '-')).toMatch(/^- \[-\] something \(\d+-\d+-\d+\)$/);
});

test('Deal with unknown task value', () => {
    const tc = new TaskCollector(new App());
    config.appendDateFormat = '[(]YYYY-MM-DD[)]';
    config.removeExpression = "#(task|todo)";
    config.incompleteTaskValues = '>';
    config.appendRemoveAllTasks = true;
    tc.updateSettings(config);

    const marked = tc.markTaskLine('- [ ] something #todo', 'm');
    expect(marked).not.toMatch(tc.initSettings.removeRegExp);
    expect(marked).toMatch(tc.initSettings.resetRegExp);
    expect(marked).toMatch(/^- \[m\] something \(\d+-\d+-\d+\)$/);

    // Don't know if this is complete (protected) or resettable. Do nothing.
    expect(tc.markTaskLine(marked, 'x')).toEqual(marked);
});

