import type { TaskCollectorSettings } from "../src/@types/settings";
import {
    COMPLETE_NAME,
    DEFAULT_COLLECTION,
    DEFAULT_NAME,
    DEFAULT_SETTINGS,
    GROUP_COMPLETE,
} from "../src/taskcollector-Constants";
import { TaskCollector } from "../src/taskcollector-TaskCollector";

vi.mock("obsidian", async () => ({
    App: vi.fn().mockImplementation(),
    moment: (await vi.importActual<typeof import("moment-obsidian")>("moment-obsidian")).default,
}));

let tc = new TaskCollector();
const begin = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
begin.collectionEnabled = true;
begin.groups[COMPLETE_NAME].collection = JSON.parse(
    JSON.stringify(DEFAULT_COLLECTION),
);

let config: TaskCollectorSettings = JSON.parse(JSON.stringify(begin));

afterEach(() => {
    tc = new TaskCollector();
    config = JSON.parse(JSON.stringify(begin)); // reset
});

test("Test move with collection disabled (no change)", () => {
    config.collectionEnabled = false;
    tc.init(config);

    const text = "- [x] Complete";

    const result = tc.moveAllTasks(text);
    expect(result).toEqual("- [x] Complete");
});

describe("Test move with collection enabled", () => {
    test("No completed items -> Log section created", () => {
        tc.init(config);

        const text = "- [ ] Incomplete";

        const result = tc.moveAllTasks(text);
        expect(result).toEqual("- [ ] Incomplete\n\n## Log\n");
    });

    test("No completed items -> Log section created (preserve continuation)", () => {
        tc.init(config);

        const text = "a  \n    text continuation";

        const result = tc.moveAllTasks(text);
        expect(result).toEqual("a  \n    text continuation\n\n## Log\n");
    });

    test("Move completed tasks", () => {
        config.groups[COMPLETE_NAME].marks += "-";
        tc.init(config);

        const start =
            "" +
            "- [ ] one\n" +
            "- [>] two\n" +
            "- [-] three\n" +
            "- [x] four\n";

        const result =
            "" +
            "- [ ] one\n" +
            "- [>] two\n" +
            "\n" +
            "## Log\n" +
            "- [-] three\n" +
            "- [x] four\n";

        expect(tc.moveAllTasks(start)).toEqual(result);
    });

    test("Move completed tasks with text continuation", () => {
        tc.init(config);

        const start =
            "\n" +
            "- [ ] An incomplete item\n" +
            "- [x] a  \n" +
            "    text continuation  \n" +
            "    \n" +
            "    Including a longer paragraph in the same bullet\n" +
            "- [ ] An incomplete item\n";

        const result =
            "\n" +
            "- [ ] An incomplete item\n" +
            "- [ ] An incomplete item\n" +
            "\n" +
            "## Log\n" +
            "- [x] a  \n" +
            "    text continuation  \n" +
            "    \n" +
            "    Including a longer paragraph in the same bullet\n";

        expect(tc.moveAllTasks(start)).toEqual(result);
    });

    test("Move completed tasks within a callout", () => {
        tc.init(config);

        const start =
            "" +
            "> - [ ] Another item\n" +
            "> - [x] This line ends with two spaces  \n" +
            ">    which allows text to wrap using strict markdown line wrapping syntax. This line should move, too.  \n" +
            ">\n" +
            ">    This is also how you support list items with multiple paragraphs (leading whitespace indent), and it should travel with the previous list item.\n" +
            ">\n" +
            "> - [ ] Another item";

        const result =
            "" +
            "> - [ ] Another item\n" +
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

    test("Move completed tasks with associated callout", () => {
        tc.init(config);

        const start =
            "" +
            "- [ ] An incomplete item\n" +
            "- [x] The nested quote should move with the item\n" +
            "    > [!note]\n" +
            "    > Nested blockquotes associated with it would also be moved.\n" +
            "- [ ] A subsequent item should not be moved\n";

        const result =
            "" +
            "- [ ] An incomplete item\n" +
            "- [ ] A subsequent item should not be moved\n" +
            "\n" +
            "## Log\n" +
            "- [x] The nested quote should move with the item\n" +
            "    > [!note]\n" +
            "    > Nested blockquotes associated with it would also be moved.\n";

        expect(tc.moveAllTasks(start)).toEqual(result);
    });
});

// Exercises the default (collectNestedTasks: false) behavior. See "Test move
// with collectNestedTasks enabled" below for the opt-in cascading behavior (#132).
test("Test move lists with mixed completion", () => {
    tc.init(config);

    const start =
        "" +
        "- [x] This line ends with two spaces  \n" +
        "    which allows text to wrap using strict markdown line wrapping syntax. This line should move, too.  \n" +
        "\n" +
        "    This is also how you support list items with multiple paragraphs (leading whitespace indent), and it should travel with the previous list item.\n" +
        "- [x] If this item is completed,\n" +
        "    any wrapped text like this should also be moved, as it is indented\n" +
        "    - [x] If there are nested bullets, it should all stay together. \n" +
        "    - [ ] This is where things get messy. If this task remained incomplete, it would stay behind\n" +
        "- [x] If this task is completed,\n" +
        "    > Nested blockquotes associated with it would also be moved.\n";

    const result =
        "" +
        "    - [ ] This is where things get messy. If this task remained incomplete, it would stay behind\n" +
        "\n" +
        "## Log\n" +
        "- [x] This line ends with two spaces  \n" +
        "    which allows text to wrap using strict markdown line wrapping syntax. This line should move, too.  \n" +
        "\n" +
        "    This is also how you support list items with multiple paragraphs (leading whitespace indent), and it should travel with the previous list item.\n" +
        "- [x] If this item is completed,\n" +
        "    any wrapped text like this should also be moved, as it is indented\n" +
        "    - [x] If there are nested bullets, it should all stay together. \n" +
        "- [x] If this task is completed,\n" +
        "    > Nested blockquotes associated with it would also be moved.\n";

    expect(tc.moveAllTasks(start)).toEqual(result);
});

describe("Test move with collectNestedTasks enabled", () => {
    beforeEach(() => {
        config.collectNestedTasks = true;
    });

    test("Remove checkbox cascades to children (#132)", () => {
        config.groups[COMPLETE_NAME].collection.removeCheckbox = true;
        tc.init(config);

        const start = "" + "- [x] A\n" + "  - [ ] B\n" + "  - [ ] C\n";

        const result = "" + "\n" + "## Log\n" + "- A\n" + "  - B\n" + "  - C\n";

        expect(tc.moveAllTasks(start)).toEqual(result);
    });

    test("Mixed-mark subtree moves as a whole unit under collected parent", () => {
        tc.init(config);

        const start =
            "" +
            "- [x] Parent done\n" +
            "  - [x] Child also done\n" +
            "  - [ ] Child not done\n";

        const result =
            "" +
            "\n" +
            "## Log\n" +
            "- [x] Parent done\n" +
            "  - [x] Child also done\n" +
            "  - [ ] Child not done\n";

        expect(tc.moveAllTasks(start)).toEqual(result);
    });

    test("Cascades through 3+ levels of nesting", () => {
        config.groups[COMPLETE_NAME].collection.removeCheckbox = true;
        tc.init(config);

        const start =
            "" +
            "- [x] Grandparent\n" +
            "  - [ ] Parent\n" +
            "    - [ ] Child\n";

        const result =
            "" +
            "\n" +
            "## Log\n" +
            "- Grandparent\n" +
            "  - Parent\n" +
            "    - Child\n";

        expect(tc.moveAllTasks(start)).toEqual(result);
    });

    test("Callout nested under a child task travels with the subtree", () => {
        tc.init(config);

        const start =
            "" +
            "- [x] Parent done\n" +
            "  - [x] Child with a callout\n" +
            "    > [!note]\n" +
            "    > Nested under the child, not the parent.\n";

        const result =
            "" +
            "\n" +
            "## Log\n" +
            "- [x] Parent done\n" +
            "  - [x] Child with a callout\n" +
            "    > [!note]\n" +
            "    > Nested under the child, not the parent.\n";

        expect(tc.moveAllTasks(start)).toEqual(result);
    });

    test("Ordered list markers mixed with bullet markers", () => {
        tc.init(config);

        const start = "" + "- [x] Parent done\n" + "  1. [ ] Ordered child\n";

        const result =
            "" +
            "\n" +
            "## Log\n" +
            "- [x] Parent done\n" +
            "  1. [ ] Ordered child\n";

        expect(tc.moveAllTasks(start)).toEqual(result);
    });

    test("Blockquote-wrapped task tree with nested children", () => {
        tc.init(config);

        const start =
            "" + "> - [x] Parent done\n" + ">   - [ ] Child not done\n";

        const result =
            "" +
            "\n" +
            "## Log\n" +
            "> - [x] Parent done\n" +
            ">   - [ ] Child not done\n";

        expect(tc.moveAllTasks(start)).toEqual(result);
    });

    test("Parent's decision governs a child from a different group, ignoring the child's own heading/mark", () => {
        // collectNestedTasks is a global setting, not a per-group one: the
        // child is marked for its own group ("deferred", -> ## Deferred),
        // but once nested under a collected parent, the whole visual
        // subtree is treated as one unit and the parent's destination and
        // removeCheckbox win for every descendant, regardless of which
        // group the descendant's own mark belongs to.
        config.groups[COMPLETE_NAME].collection.removeCheckbox = true;
        config.groups["deferred"] = {
            ...JSON.parse(JSON.stringify(GROUP_COMPLETE)),
            marks: ">",
            collection: {
                areaHeading: "## Deferred",
                removeCheckbox: false,
            },
        };
        tc.init(config);

        const start = "" + "- [x] Parent done\n" + "  - [>] Deferred child\n";

        const result =
            "" +
            "\n" +
            "## Deferred\n" +
            "\n" +
            "## Log\n" +
            "- Parent done\n" +
            "  - Deferred child\n";

        expect(tc.moveAllTasks(start)).toEqual(result);
    });
});

describe("Test move with multiple sections", () => {
    beforeEach(() => {
        config.groups["deferred"] = {
            ...JSON.parse(JSON.stringify(GROUP_COMPLETE)),
            marks: ">",
            collection: {
                areaHeading: "## Deferred",
                removeCheckbox: false,
            },
        };
    });

    test("No completed or deferred items -> Log & Deferred sections created", () => {
        tc.init(config);

        const text = "- [ ] Incomplete";

        const result = tc.moveAllTasks(text);
        expect(result).toEqual("- [ ] Incomplete\n\n## Deferred\n\n## Log\n");
    });

    test("Move completed tasks between sections", () => {
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

    test("Move duplicate section", () => {
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
            "- [>] six";

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
            "- [>] six";

        expect(tc.moveAllTasks(start)).toEqual(result);
    });

    test("Move unmarked items with no loss", () => {
        // Ensure that unmarked items are not lost when moving. Issue #262
        config.groups[DEFAULT_NAME].collection = {
            areaHeading: "## 1 - ToDos",
            removeCheckbox: false,
        };
        config.groups[COMPLETE_NAME].collection = {
            areaHeading: "## 9 - Done √",
            removeCheckbox: false,
        };
        config.groups["deferred"].collection = {
            areaHeading: "## 2 - Later >",
            removeCheckbox: false,
        };
        tc.init(config);

        const start =
            "## 1 - ToDos\n" +
            "- [ ] 1\n" +
            "- [ ] 2\n" +
            "- [ ] 3\n" +
            "## 2 - Later >\n" +
            "\n" +
            "## 9 - Done √\n" +
            "- [ ] aa\n" +
            "- [ ] bb\n" +
            "- [ ] cc";

        const result =
            "## 1 - ToDos\n" +
            "- [ ] aa\n" +
            "- [ ] bb\n" +
            "- [ ] cc\n" +
            "- [ ] 1\n" +
            "- [ ] 2\n" +
            "- [ ] 3\n" +
            "## 2 - Later >\n" +
            "\n" +
            "## 9 - Done √";

        expect(tc.moveAllTasks(start)).toEqual(result);
    });

    test("Move completed tasks around skipped section", () => {
        config.groups[COMPLETE_NAME].marks += "-";
        config.skipSectionMatch = "# ❧ ";
        tc.init(config);

        const start =
            "" +
            "- [ ] one\n" +
            "- [>] two\n" +
            "## ❧ Ignore me\n" +
            "- [-] three\n" +
            "## ❧ Ignore me twice\n" +
            "- [x] four\n";

        const result =
            "" +
            "- [ ] one\n" +
            "## ❧ Ignore me\n" +
            "- [-] three\n" +
            "## ❧ Ignore me twice\n" +
            "- [x] four\n" +
            "\n" +
            "## Deferred\n" +
            "- [>] two\n" +
            "\n" +
            "## Log\n";

        expect(tc.moveAllTasks(start)).toEqual(result);
    });
});
