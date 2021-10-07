import { App } from "obsidian";
import { TaskCollector } from "../src/TaskCollector";
import { DEFAULT_SETTINGS, TaskCollectorSettings } from "../src/TaskCollectorSettings";

jest.mock("obsidian");

const config: TaskCollectorSettings = Object.assign({}, DEFAULT_SETTINGS);;

afterEach(() => {
    // reset config to defaults
    Object.assign(config, DEFAULT_SETTINGS);
});

describe('Set an append date', () => {

    test('Test default settings', () => {
        const tc = new TaskCollector(new App());
        tc.updateSettings(config);

        expect(tc.initSettings.removeRegExp).toBeNull();
        expect(tc.initSettings.resetRegExp).toBeNull();
        expect('- [ ]').toMatch(tc.initSettings.incompleteTaskRegExp);
        expect('- [>]').not.toMatch(tc.initSettings.incompleteTaskRegExp);

        expect('- [x] something').toEqual(tc.updateTaskLine('- [ ] something', 'x'));
        expect('- [>] something').toEqual(tc.updateTaskLine('- [>] something', 'x'));
    })

    test('Correctly matches > when included in incomplete pattern', () => {
        const tc = new TaskCollector(new App());
        config.incompleteTaskValues = ' >';
        tc.updateSettings(config);

        expect(tc.initSettings.removeRegExp).toBeNull();
        expect(tc.initSettings.resetRegExp).toBeNull();
        expect('- [ ]').toMatch(tc.initSettings.incompleteTaskRegExp);
        expect('- [>]').toMatch(tc.initSettings.incompleteTaskRegExp);

        expect('- [x] something').toEqual(tc.updateTaskLine('- [>] something', 'x'));
    });

    test('Correctly matches specified removal patterns', () => {
        const tc = new TaskCollector(new App());
        config.removeExpression = "#(task|todo)";
        tc.updateSettings(config);

        expect('- [x] something #todo').toMatch(tc.initSettings.removeRegExp);
        expect('- [x] something #task').toMatch(tc.initSettings.removeRegExp);
        expect('- [x] something #task #todo').toMatch(tc.initSettings.removeRegExp);
        expect('- [x] something else').not.toMatch(tc.initSettings.removeRegExp);

        expect('- [x] something ').toEqual(tc.updateTaskLine('- [ ] something #todo', 'x'));
        expect('- [ ] something ').toEqual(tc.resetTaskLine('- [x] something '));
    });

    test('Correctly matches YYYY-MM-DD append string', () => {
        const tc = new TaskCollector(new App());
        config.appendDateFormat = 'YYYY-MM-DD';
        tc.updateSettings(config);

        expect('- [x] something 2021-08-24').toMatch(tc.initSettings.resetRegExp);
        expect('- [ ] something ').toEqual(tc.resetTaskLine('- [x] something 2021-08-24'));

        expect('- [x] something (2021-08-24)').not.toMatch(tc.initSettings.resetRegExp);
        expect('- [x] 2021-08-24 something else').not.toMatch(tc.initSettings.resetRegExp);
    });

    test('Correctly matches (YYYY-MM-DD) append string', () => {
        const tc = new TaskCollector(new App());
        config.appendDateFormat = '[(]YYYY-MM-DD[)]';
        tc.updateSettings(config);

        expect('- [x] something (2021-08-24)').toMatch(tc.initSettings.resetRegExp);
        expect('- [ ] something ').toEqual(tc.resetTaskLine('- [x] something (2021-08-24)'));

        expect('- [x] something 2021-08-24').not.toMatch(tc.initSettings.resetRegExp);
        expect('- [x] 2021-08-24 something else').not.toMatch(tc.initSettings.resetRegExp);
    });

    test('Correctly matches (D MMM, YYYY) append string', () => {
        const tc = new TaskCollector(new App());
        config.appendDateFormat = '[(]D MMM, YYYY[)]';
        tc.updateSettings(config);

        expect('- [x] something (6 Oct, 2021)').toMatch(tc.initSettings.resetRegExp);
        expect('- [ ] something ').toEqual(tc.resetTaskLine('- [x] something (6 Oct, 2021)'));

        expect('- [x] something 6 Oct, 2021').not.toMatch(tc.initSettings.resetRegExp);
        expect('- [x] 6 Oct, 2021, something else').not.toMatch(tc.initSettings.resetRegExp);
        expect('- [x] 2021-10-06 something else').not.toMatch(tc.initSettings.resetRegExp);
    });

    test('Correctly matches DD MMM, YYYY append string', () => {
        const tc = new TaskCollector(new App());
        config.appendDateFormat = 'DD MMM, YYYY';
        tc.updateSettings(config);

        expect('- [x] something 06 Oct, 2021').toMatch(tc.initSettings.resetRegExp);
        expect('- [ ] something ').toEqual(tc.resetTaskLine('- [x] something 06 Oct, 2021'));

        expect('- [x] something (6 Oct, 2021)').not.toMatch(tc.initSettings.resetRegExp);
        expect('- [x] something 6 Oct, 2021').not.toMatch(tc.initSettings.resetRegExp);
        expect('- [x] 6 Oct, 2021, something else').not.toMatch(tc.initSettings.resetRegExp);
        expect('- [x] 2021-10-06 something else').not.toMatch(tc.initSettings.resetRegExp);
    });

    test('Correctly matches [(completed on ]D MMM, YYYY[)] append string', () => {
        const tc = new TaskCollector(new App());
        config.appendDateFormat = '[(completed on ]D MMM, YYYY[)]';
        tc.updateSettings(config);

        expect('- [x] something (completed on 6 Oct, 2021)').toMatch(tc.initSettings.resetRegExp);
        expect('- [ ] something ').toEqual(tc.resetTaskLine('- [x] something (completed on 6 Oct, 2021)'));

        expect('- [x] something (6 Oct, 2021)').not.toMatch(tc.initSettings.resetRegExp);
        expect('- [x] something 6 Oct, 2021').not.toMatch(tc.initSettings.resetRegExp);
        expect('- [x] 6 Oct, 2021, something else').not.toMatch(tc.initSettings.resetRegExp);
        expect('- [x] 2021-10-06 something else').not.toMatch(tc.initSettings.resetRegExp);
    });
});

