import { TaskCollector } from "../src/taskcollector-TaskCollector";
import { TaskCollectorSettings } from "../src/@types/settings";
import moment from 'moment';
import { COMPLETE_NAME, DEFAULT_COLLECTION, DEFAULT_NAME, DEFAULT_SETTINGS, GROUP_COMPLETE, GROUP_DEFAULT } from "../src/taskcollector-Constants";

window.moment = moment;
jest.mock('obsidian', () => ({
    App: jest.fn().mockImplementation()
}));

let tc = new TaskCollector();
const begin = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
begin.collectionEnabled = true;
begin.groups[COMPLETE_NAME].collection = JSON.parse(JSON.stringify(DEFAULT_COLLECTION));

let config: TaskCollectorSettings = JSON.parse(JSON.stringify(begin));

const start = ""
    + "- [ ] i1\n"
    + "- [x] one\n"
    + "- [>] two\n"
    + "\n"
    + "## To Do\n"
    + "\n"
    + "## Log\n"
    + "- [ ] i2\n"
    + "- [x] three\n"
    + "- [>] four\n"
    + "\n"
    + "## Deferred\n"
    + "- [ ] i3\n"
    + "- [x] five\n"
    + "- [>] six\n"
    + "";

afterEach(() => {
    tc = new TaskCollector();
    config = JSON.parse(JSON.stringify(begin)); // reset
});

test('Reset with collection disabled', () => {
    config.collectionEnabled = false;
    tc.init(config);

    // all items are reset
    const expected = ""
        + "- [ ] i1\n"
        + "- [ ] one\n"
        + "- [ ] two\n"
        + "\n"
        + "## To Do\n"
        + "\n"
        + "## Log\n"
        + "- [ ] i2\n"
        + "- [ ] three\n"
        + "- [ ] four\n"
        + "\n"
        + "## Deferred\n"
        + "- [ ] i3\n"
        + "- [ ] five\n"
        + "- [ ] six\n"
        + "";

    const result = tc.resetAllTasks(start);
    expect(result).toEqual(expected);
});

test('Reset with collection enabled', () => {
    config.groups["deferred"] = {
        ...JSON.parse(JSON.stringify(GROUP_COMPLETE)),
        marks: ">",
        collection: {
            areaHeading: "## Deferred",
            removeCheckbox: false,
        }
    }
    tc.init(config);

    // items in "completion" areas are left alone
    const expected = ""
        + "- [ ] i1\n"
        + "- [ ] one\n"
        + "- [ ] two\n"
        + "\n"
        + "## To Do\n"
        + "\n"
        + "## Log\n"
        + "- [ ] i2\n"
        + "- [x] three\n"
        + "- [>] four\n"
        + "\n"
        + "## Deferred\n"
        + "- [ ] i3\n"
        + "- [x] five\n"
        + "- [>] six\n"
        + "";

    const result = tc.resetAllTasks(start);
    expect(result).toEqual(expected);
});

test('Reset with collection enabled and skipped section', () => {
    config.groups["deferred"] = {
        ...JSON.parse(JSON.stringify(GROUP_COMPLETE)),
        marks: ">",
    }
    config.skipSectionMatch = "# ❧ ";
    tc.init(config);

    const startSkipped = ""
        + "- [ ] i1\n"
        + "- [x] one\n"
        + "- [>] two\n"
        + "\n"
        + "## To Do\n"
        + "\n"
        + "## Log\n"
        + "- [ ] i2\n"
        + "- [x] three\n"
        + "- [>] four\n"
        + "\n"
        + "## ❧ Deferred\n"
        + "- [ ] i3\n"
        + "- [x] five\n"
        + "- [>] six\n"
        + "";

    // items in "completion" areas are left alone
    const expected = ""
        + "- [ ] i1\n"
        + "- [ ] one\n"
        + "- [ ] two\n"
        + "\n"
        + "## To Do\n"
        + "\n"
        + "## Log\n"
        + "- [ ] i2\n"
        + "- [x] three\n"
        + "- [>] four\n"
        + "\n"
        + "## ❧ Deferred\n"
        + "- [ ] i3\n"
        + "- [x] five\n"
        + "- [>] six\n"
        + "";

    const result = tc.resetAllTasks(startSkipped);
    expect(result).toEqual(expected);
});
