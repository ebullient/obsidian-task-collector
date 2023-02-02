import { TaskCollector } from "../src/taskcollector-TaskCollector";
import { TaskCollectorSettings } from "../src/@types/settings";
import * as Moment from 'moment';
import { COMPLETE_NAME, DEFAULT_COLLECTION, DEFAULT_NAME, DEFAULT_SETTINGS, GROUP_COMPLETE, GROUP_DEFAULT } from "../src/taskcollector-Constants";

jest.mock('obsidian', () => ({
    App: jest.fn().mockImplementation(),
    moment: () => Moment()
}));

let tc = new TaskCollector();
const begin = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
begin.collectionEnabled = true;
begin.groups[COMPLETE_NAME].collection = JSON.parse(JSON.stringify(DEFAULT_COLLECTION));

let config: TaskCollectorSettings = JSON.parse(JSON.stringify(begin));

afterEach(() => {
    tc = new TaskCollector();
    config = JSON.parse(JSON.stringify(begin)); // reset
});

test('Test move with collection disabled (no change)', () => {
    config.collectionEnabled = false;
    tc.init(config);

    const text = "- [x] Complete";

    const result = tc.moveAllTasks(text);
    expect(result).toEqual("- [x] Complete");
});

describe('Test move with collection enabled', () => {
    test('No completed items -> Log section created', () => {
        tc.init(config);

        const text = "- [ ] Incomplete";

        const result = tc.moveAllTasks(text);
        expect(result).toEqual("- [ ] Incomplete\n\n## Log\n");
    });

    test('No completed items -> Log section created (preserve continuation)', () => {
        tc.init(config);

        const text = "a  \n    text continuation";

        const result = tc.moveAllTasks(text);
        expect(result).toEqual("a  \n    text continuation\n\n## Log\n");
    });

    test('Move completed tasks', () => {
        config.groups[COMPLETE_NAME].marks += '-';
        tc.init(config);

        const start =
        "- [ ] one\n" +
        "- [>] two\n" +
        "- [-] three\n" +
        "- [x] four\n";

        const result =
            "- [ ] one\n" +
            "- [>] two\n" +
            "\n" +
            "## Log\n" +
            "- [-] three\n" +
            "- [x] four\n";

        expect(tc.moveAllTasks(start)).toEqual(result);
    });

    test('Move completed tasks with text continuation', () => {
        tc.init(config);

        const start = "\n"
                + "- [x] a  \n"
                + "    text continuation  \n"
                + "    \n"
                + "    Including a longer paragraph in the same bullet\n";

        expect(tc.moveAllTasks(start))
            .toEqual("\n\n"
                    + "## Log\n"
                    + "- [x] a  \n"
                    + "    text continuation  \n"
                    + "    \n"
                    + "    Including a longer paragraph in the same bullet\n");
    });

    test('Move completed tasks within a callout', () => {
        tc.init(config);

        const start =
        "> - [x] This line ends with two spaces  \n" +
        ">    which allows text to wrap using strict markdown line wrapping syntax. This line should move, too.  \n" +
        ">\n" +
        ">    This is also how you support list items with multiple paragraphs (leading whitespace indent), and it should travel with the previous list item.\n" +
        ">\n" +
        "> - [ ] Another item";

        const result =
        "> - [ ] Another item\n" +
        "\n" +
        "## Log\n" +
        "> - [x] This line ends with two spaces  \n" +
        ">    which allows text to wrap using strict markdown line wrapping syntax. This line should move, too.  \n" +
        ">\n" +
        ">    This is also how you support list items with multiple paragraphs (leading whitespace indent), and it should travel with the previous list item.\n" +
        ">\n";

        expect(tc.moveAllTasks(start)).toEqual(result);
    });

    test('Move completed tasks with associated callout', () => {
        tc.init(config);

        const start =
        "- [x] The nested quote should move with the item\n" +
        "    > [!note]\n" +
        "    > Nested blockquotes associated with it would also be moved.";

        const result =
        "\n" +
        "## Log\n" +
        "- [x] The nested quote should move with the item\n" +
        "    > [!note]\n" +
        "    > Nested blockquotes associated with it would also be moved.\n";

        expect(tc.moveAllTasks(start)).toEqual(result);
    });
});

describe('Test move with multiple sections', () => {
    beforeEach(() => {
        config.groups["deferred"] = {
            ...JSON.parse(JSON.stringify(GROUP_COMPLETE)),
            marks: ">",
            collection: {
                areaHeading: "## Deferred",
                removeCheckbox: false,
            }
        }
    });

    test('No completed or deferred items -> Log & Deferred sections created', () => {
        tc.init(config);

        const text = "- [ ] Incomplete";

        const result = tc.moveAllTasks(text);
        expect(result).toEqual("- [ ] Incomplete\n\n## Deferred\n\n## Log\n");
    });

    test('Move completed tasks between sections', () => {
        config.groups[DEFAULT_NAME].collection = {
            areaHeading: "## To Do",
            removeCheckbox: false,
        };
        tc.init(config);

        const start =
            "- [ ] i1\n" +
            "- [x] one\n" +
            "- [>] two\n" +
            "\n" +
            "## To Do\n" +
            "\n" +
            "## Log\n" +
            "- [ ] i2\n" +
            "- [x] three\n" +
            "- [>] four\n" +
            "\n" +
            "## Deferred\n" +
            "- [ ] i3\n" +
            "- [x] five\n" +
            "- [>] six\n" +
            "";

        const result =
            "\n" +
            "## To Do\n" +
            "- [ ] i1\n" +
            "- [ ] i2\n" +
            "- [ ] i3\n" +
            "\n" +
            "## Log\n" +
            "- [x] one\n" +
            "- [x] five\n" +
            "- [x] three\n" +
            "\n" +
            "## Deferred\n" +
            "- [>] two\n" +
            "- [>] four\n" +
            "- [>] six\n" +
            "";

        expect(tc.moveAllTasks(start)).toEqual(result);
    });

    test('Move duplicate section', () => {
        tc.init(config);

        const start =
            "- [ ] i1\n" +
            "- [x] one\n" +
            "- [>] two\n" +
            "\n" +
            "## Deferred\n" +
            "\n" +
            "## Log\n" +
            "- [x] three\n" +
            "- [>] four\n" +
            "\n" +
            "## Deferred\n" +
            "- [x] five\n" +
            "- [>] six\n" +
            "";

        const result =
            "- [ ] i1\n" +
            "\n" +
            "## Deferred\n" +
            "- [>] two\n" +
            "\n" +
            "## Log\n" +
            "- [x] one\n" +
            "- [x] five\n" +
            "- [x] three\n" +
            "\n" +
            "## Deferred\n" +
            "- [>] four\n" +
            "- [>] six\n" +
            "";

        expect(tc.moveAllTasks(start)).toEqual(result);
    });
});
