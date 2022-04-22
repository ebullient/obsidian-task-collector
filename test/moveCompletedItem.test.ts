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

test('Test move -- no completed items', () => {
    const tc = new TaskCollector(new App());
    tc.updateSettings(config);

    const text = "- [ ] Incomplete";

    const result = tc.moveCompletedTasksInFile(text);
    expect(result).toEqual("- [ ] Incomplete\n\n## Log");
});

test('Test move -- no completed items; continuation', () => {
    const tc = new TaskCollector(new App());
    tc.updateSettings(config);

    const text = "a  \n    text continuation";

    const result = tc.moveCompletedTasksInFile(text);
    expect(result).toEqual("a  \n    text continuation\n\n## Log");
});

test('Move completed items to archive area', () => {
    const tc = new TaskCollector(new App());
    config.supportCanceledTasks = true;
    tc.updateSettings(config);

    const start = "- [ ] one\n- [>] two\n- [-] three\n- [x] four";
    expect(tc.moveCompletedTasksInFile(start))
        .toEqual("- [ ] one\n- [>] two\n\n## Log\n- [-] three\n- [x] four");
});

test('Test move completed item', () => {
    const tc = new TaskCollector(new App());
    tc.updateSettings(config);

    const start = "\n- [x] a  \n    text continuation  \n    \n    Including a longer paragraph in the same bullet\n";

    expect(tc.moveCompletedTasksInFile(start))
        .toEqual("\n\n## Log\n- [x] a  \n    text continuation  \n    \n    Including a longer paragraph in the same bullet");
});
