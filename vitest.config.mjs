import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
