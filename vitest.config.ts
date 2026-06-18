import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
    test: {
        environment: "happy-dom",
        globals: true,
        setupFiles: ["./test/setup.ts"],
        alias: {
            obsidian: path.resolve(__dirname, "test/mocks/obsidian.ts"),
            "moment-obsidian": path.resolve(
                __dirname,
                "node_modules/obsidian/node_modules/moment/moment.js",
            ),
        },
    },
});
