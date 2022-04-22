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

    expect(tc.completeTaskLine('- [ ] something #todo', 'x')).toEqual('- [x] something ');
    expect(tc.completeTaskLine('- [>] something #todo', 'x')).toEqual('- [x] something ');
    expect(tc.resetTaskLine('- [x] something #todo', ' ')).toEqual('- [ ] something #todo');
    expect(tc.resetTaskLine('- [>] something #todo', ' ')).toEqual('- [ ] something #todo');
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

    test('Preserve continuation with strict line-break', () => {
        const tc = new TaskCollector(new App());
        config.appendDateFormat = '[(]YYYY-MM-DD[)]';
        tc.updateSettings(config);

        const completed = tc.completeTaskLine('- [ ] something  ', 'x');
        expect(completed).toMatch(/- \[x\] something  \(\d+-\d+-\d+\)  /);
    });
});

