jest.mock("obsidian", () => ({
    App: jest.fn().mockImplementation(),
    PluginSettingTab: class {},
    Notice: jest.fn(),
    Setting: class {},
    debounce: jest.fn(),
    moment: jest.fn(),
}));

import { uniqueMarkCycleChars } from "../src/taskcollector-SettingsTab";

test("uniqueMarkCycleChars preserves first occurrence order", () => {
    expect(uniqueMarkCycleChars("x x>xx")).toBe("x >");
});
