import { DEFAULT_SETTINGS, TEXT_ONLY_NAME, TEXT_ONLY_MARK, DEFAULT_NAME, COMPLETE_NAME } from "../src/taskcollector-Constants";
import { TaskCollectorSettings } from "../src/@types/settings";
import { TaskCollector } from "../src/taskcollector-TaskCollector";
import moment from 'moment';
import { Data } from "../src/taskcollector-Data";

window.moment = moment;
jest.mock('obsidian', () => ({
    App: jest.fn().mockImplementation()
}));

let tc = new TaskCollector();
let config: TaskCollectorSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

afterEach(() => {
    tc = new TaskCollector();
    config =  JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
});

test('Match blockquotes / callouts', () => {
    tc.init(config);

    expect('> - [x] ').toMatch(tc.anyTaskMark);
    expect('> > - [x] ').toMatch(tc.anyTaskMark);
    expect('> - [ ] ').toMatch(tc.anyTaskMark);
    expect('> > - [ ] ').toMatch(tc.anyTaskMark);
});

test('Match specified removal patterns', () => {
    config.groups[COMPLETE_NAME].removeExpr = "#(task|todo)";
    tc.init(config);

    expect('- [ ] something #todo').toMatch(tc.cache.removeExpr[COMPLETE_NAME]);
    expect('- [ ] something #task').toMatch(tc.cache.removeExpr[COMPLETE_NAME]);
    expect('- [ ] something #task #todo').toMatch(tc.cache.removeExpr[COMPLETE_NAME]);
    expect('- [ ] something else').not.toMatch(tc.cache.removeExpr[COMPLETE_NAME]);

    // Remove text when transitioning to 'x'
    expect(tc.updateLineText('- [ ] something #todo', 'x')).toEqual('- [x] something');
    expect(tc.updateLineText('- [>] something #todo', 'x')).toEqual('- [x] something');
    // text not removed when transitioning to something else (default)
    expect(tc.updateLineText('- [x] something #todo', ' ')).toEqual('- [ ] something #todo');
    expect(tc.updateLineText('- [>] something #todo', 'm')).toEqual('- [m] something #todo');
});

describe('Set an append date', () => {
    test('YYYY-MM-DD append string', () => {
        config.groups[COMPLETE_NAME].appendDateFormat= 'YYYY-MM-DD';
        tc.init(config);

        // make sure various strings match the undo expression
        expect('- [x] something 2021-08-24').toMatch(tc.cache.undoExpr[COMPLETE_NAME]);
        expect('- [x] something   2021-08-24  ').toMatch(tc.cache.undoExpr[COMPLETE_NAME]);
        expect('- [x] something (2021-08-24)').not.toMatch(tc.cache.undoExpr[COMPLETE_NAME]);
        expect('- [x] 2021-08-24 something else').not.toMatch(tc.cache.undoExpr[COMPLETE_NAME]);

        const completed = tc.updateLineText('- [ ] something #todo', 'x');
        expect(completed).toMatch(tc.cache.undoExpr[COMPLETE_NAME]);
        expect(tc.updateLineText(completed, ' ')).toEqual('- [ ] something #todo');
    });

    test('(YYYY-MM-DD) append string', () => {
        config.groups[COMPLETE_NAME].appendDateFormat= '[(]YYYY-MM-DD[)]';
        tc.init(config);

        expect('- [x] something (2021-08-24)').toMatch(tc.cache.undoExpr[COMPLETE_NAME]);

        expect('- [x] something 2021-08-24').not.toMatch(tc.cache.undoExpr[COMPLETE_NAME]);
        expect('- [x] 2021-08-24 something else').not.toMatch(tc.cache.undoExpr[COMPLETE_NAME]);

        const completed = tc.updateLineText('- [ ] something #todo', 'x');
        expect(completed).toMatch(tc.cache.undoExpr[COMPLETE_NAME]);
        expect(tc.updateLineText(completed, ' ')).toEqual('- [ ] something #todo');
    });

    test('(D MMM, YYYY) append string', () => {
            config.groups[COMPLETE_NAME].appendDateFormat= '[(]D MMM, YYYY[)]';
        tc.init(config);

        expect('- [x] something (6 Oct, 2021)').toMatch(tc.cache.undoExpr[COMPLETE_NAME]);

        expect('- [x] something 6 Oct, 2021').not.toMatch(tc.cache.undoExpr[COMPLETE_NAME]);
        expect('- [x] 6 Oct, 2021, something else').not.toMatch(tc.cache.undoExpr[COMPLETE_NAME]);
        expect('- [x] 2021-10-06 something else').not.toMatch(tc.cache.undoExpr[COMPLETE_NAME]);

        const completed = tc.updateLineText('- [ ] something #todo', 'x');
        expect(completed).toMatch(tc.cache.undoExpr[COMPLETE_NAME]);
        expect(tc.updateLineText(completed, ' ')).toEqual('- [ ] something #todo');
    });

    test('DD MMM, YYYY append string', () => {
        config.groups[COMPLETE_NAME].appendDateFormat= 'DD MMM, YYYY';
        tc.init(config);

        expect('- [x] something 06 Oct, 2021').toMatch(tc.cache.undoExpr[COMPLETE_NAME]);

        expect('- [x] something (6 Oct, 2021)').not.toMatch(tc.cache.undoExpr[COMPLETE_NAME]);
        expect('- [x] something 6 Oct, 2021').not.toMatch(tc.cache.undoExpr[COMPLETE_NAME]);
        expect('- [x] 6 Oct, 2021, something else').not.toMatch(tc.cache.undoExpr[COMPLETE_NAME]);
        expect('- [x] 2021-10-06 something else').not.toMatch(tc.cache.undoExpr[COMPLETE_NAME]);

        const completed = tc.updateLineText('- [ ] something #todo', 'x');
        expect(completed).toMatch(tc.cache.undoExpr[COMPLETE_NAME]);
        expect(tc.updateLineText(completed, ' ')).toEqual('- [ ] something #todo');
    });

    test('[(completed on ]D MMM, YYYY[)] append string', () => {
        config.groups[COMPLETE_NAME].appendDateFormat= '[(completed on ]D MMM, YYYY[)]';
        tc.init(config);

        expect("+ [x] something (completed on 6 Oct, 2021)").toMatch(
            tc.cache.undoExpr[COMPLETE_NAME],
        );

        expect("+ [x] something (6 Oct, 2021)").not.toMatch(
            tc.cache.undoExpr[COMPLETE_NAME],
        );
        expect("+ [x] something 6 Oct, 2021").not.toMatch(
            tc.cache.undoExpr[COMPLETE_NAME],
        );
        expect("+ [x] 6 Oct, 2021, something else").not.toMatch(
            tc.cache.undoExpr[COMPLETE_NAME],
        );
        expect("+ [x] 2021-10-06 something else").not.toMatch(
            tc.cache.undoExpr[COMPLETE_NAME],
        );

        const completed = tc.updateLineText("+ [ ] something #todo", "x");
        expect(completed).toMatch(tc.cache.undoExpr[COMPLETE_NAME]);
        expect(tc.updateLineText(completed, " ")).toEqual("+ [ ] something #todo");
    });

    test('[✅ ]YYYY-MM-DDTHH:mm append string', () => {
        config.groups[COMPLETE_NAME].appendDateFormat= '[✅ ]YYYY-MM-DDTHH:mm';
        tc.init(config);

        expect("* [x] something ✅ 2021-10-07T13:55").toMatch(
            tc.cache.undoExpr[COMPLETE_NAME],
        );

        expect("* [x] something (6 Oct, 2021)").not.toMatch(
            tc.cache.undoExpr[COMPLETE_NAME],
        );
        expect("* [x] something 6 Oct, 2021").not.toMatch(
            tc.cache.undoExpr[COMPLETE_NAME],
        );
        expect("* [x] 6 Oct, 2021, something else").not.toMatch(
            tc.cache.undoExpr[COMPLETE_NAME],
        );
        expect("* [x] 2021-10-06 something else").not.toMatch(
            tc.cache.undoExpr[COMPLETE_NAME],
        );

        const completed = tc.updateLineText("* [ ] something #todo", "x");
        expect(completed).toMatch(tc.cache.undoExpr[COMPLETE_NAME]);
        expect(tc.updateLineText(completed, " ")).toEqual("* [ ] something #todo");
    });

    test('Dataview annotated string [completion::2021-08-15]', () => {
        config.groups[COMPLETE_NAME].appendDateFormat= '[[completion::]YYYY-MM-DD[]]';
        tc.init(config);

        expect('- [x] I finished this on [completion::2021-08-15]').toMatch(tc.cache.undoExpr[COMPLETE_NAME]);

        expect('- [x] something (6 Oct, 2021)').not.toMatch(tc.cache.undoExpr[COMPLETE_NAME]);
        expect('- [x] something 6 Oct, 2021').not.toMatch(tc.cache.undoExpr[COMPLETE_NAME]);
        expect('- [x] 6 Oct, 2021, something else').not.toMatch(tc.cache.undoExpr[COMPLETE_NAME]);
        expect('- [x] 2021-10-06 something else').not.toMatch(tc.cache.undoExpr[COMPLETE_NAME]);

        const completed = tc.updateLineText('- [ ] something #todo', 'x');
        expect(completed).toMatch(tc.cache.undoExpr[COMPLETE_NAME]);
        expect(tc.updateLineText(completed, ' ')).toEqual('- [ ] something #todo');
    });

    test('Correctly insert annotation ahead of block reference', () => {
        config.groups[COMPLETE_NAME].appendDateFormat= '[[completion::]YYYY-MM-DD[]]';
        tc.init(config);

        expect('- [ ] something (6 Oct, 2021) ^your-ID-1').toMatch(tc.blockRef);
        expect('- [x] I finished this on [completion::2021-08-15] ^your-ID-1').toMatch(tc.blockRef);
        expect('- [x] I finished this on [completion::2021-08-15] ^your-ID-1').toMatch(tc.cache.undoExpr[COMPLETE_NAME]);

        const completed = tc.updateLineText('- [ ] something #todo ^your-ID-1', 'x');
        expect(completed).toMatch(/- \[x\] something #todo \[completion::\d+-\d+-\d+\] \^your-ID-1/);
        expect(completed).toMatch(tc.cache.undoExpr[COMPLETE_NAME]);
        expect(tc.updateLineText(completed, ' ')).toEqual('- [ ] something #todo ^your-ID-1');
    });

    test('Preserve continuation with strict line-break', () => {
            config.groups[COMPLETE_NAME].appendDateFormat= '[(]YYYY-MM-DD[)]';
        tc.init(config);

        const completed = tc.updateLineText('- [ ] something  ', 'x');
        expect(completed).toMatch(/- \[x\] something  \(\d+-\d+-\d+\)  /);
    });

    test('Preserve continuation with strict line-break across reset', () => {
        config.groups[DEFAULT_NAME].marks += '>';
        config.groups[DEFAULT_NAME].appendDateFormat= '[(]YYYY-MM-DD[)]';
        config.groups[COMPLETE_NAME].appendDateFormat= '[(]YYYY-MM-DD[)]';
        tc.init(config);

        const completed = tc.updateLineText('- [ ] something  ', 'x');
        expect(completed).toMatch(tc.cache.undoExpr[COMPLETE_NAME]);
        expect(completed).toMatch(/^- \[x\] something\s+\(\d+-\d+-\d+\)  $/);

        const forwarded = tc.updateLineText(completed, '>');
        expect(forwarded).toMatch(tc.cache.undoExpr[COMPLETE_NAME]);
        expect(forwarded).toMatch(/^- \[>\] something\s+\(\d+-\d+-\d+\)  $/);

        expect(tc.updateLineText(forwarded, 'x')).toMatch(/^- \[x\] something\s+\(\d+-\d+-\d+\)  $/);
    });

    test('Deal with lots of square brackets', () => {
        config.groups[DEFAULT_NAME].marks += '>';
        config.groups[COMPLETE_NAME].appendDateFormat= '[[completion::]YYYY-MM-DD[] ✅ ]YYYY-MM-DD[T]HH:mm';
        tc.init(config);

        const completed = tc.updateLineText('- [ ] something', 'x');
        expect(completed).toMatch(tc.cache.undoExpr[COMPLETE_NAME]);
        expect(completed).toMatch(/^- \[x\] something \[completion::\d+-\d+-\d+\] ✅ \d+-\d+-\d+T\d+:\d+$/);
        expect(tc.updateLineText(completed, ' ')).toEqual('- [ ] something');
    });

    test('Mark plain text', () => {
        Data.createSettingsGroup(config.groups, TEXT_ONLY_NAME, {
            marks: TEXT_ONLY_MARK,
            removeExpr: "#(task|todo)",
            appendDateFormat: '[(]D MMM, YYYY[)]'
        })
        tc.init(config);

        const marked = tc.updateLineText('something  ', '');
        expect(marked).toMatch(tc.cache.undoExpr[TEXT_ONLY_NAME]);
    });
});

test('Apply text stripping/reset rules between task groups', () => {
    config.groups[DEFAULT_NAME].marks += '>';
    config.groups[DEFAULT_NAME].appendDateFormat= '[(]D MMM, YYYY[)]';
    config.groups[COMPLETE_NAME].appendDateFormat= '[(]YYYY-MM-DD[)]';
    config.groups[DEFAULT_NAME].removeExpr = "#done";
    config.groups[COMPLETE_NAME].removeExpr = "#todo";
    tc.init(config);

    const completed = tc.updateLineText('- [ ] something #todo', 'x');
    expect(completed).not.toMatch(tc.cache.removeExpr[COMPLETE_NAME]);
    expect(completed).toMatch(tc.cache.undoExpr[COMPLETE_NAME]);
    expect(completed).toMatch(/^- \[x\] something \(\d+-\d+-\d+\)$/);

    const changed = tc.updateLineText('- [x] something #done  (2022-04-26)', '>');
    expect(changed).not.toMatch(tc.cache.removeExpr[DEFAULT_NAME]);
    expect(changed).toMatch(tc.cache.undoExpr[DEFAULT_NAME]);
    expect(changed).toMatch(/^- \[>\] something\s+\(\d+ \S+, \d+\)$/);

    expect(tc.updateLineText(changed, 'x')).toEqual(completed);
    expect(tc.updateLineText(changed, '-')).toMatch(/^- \[-\] something \(\d+ \S+, \d+\)$/);
});

