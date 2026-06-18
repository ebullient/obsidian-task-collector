vi.mock("obsidian", () => ({
    App: vi.fn().mockImplementation(),
    Modal: class {},
    PluginSettingTab: class {},
    Notice: vi.fn(),
    Setting: class {},
    debounce: vi.fn(),
    moment: vi.fn(),
}));

import { uniqueMarkCycleChars } from "../src/taskcollector-SettingsTab";

test("uniqueMarkCycleChars preserves first occurrence order", () => {
    expect(uniqueMarkCycleChars("x x>xx")).toBe("x >");
});
