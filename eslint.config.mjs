// eslint.config.mjs
import globals from "globals";
import tsparser from "@typescript-eslint/parser";
import { defineConfig, globalIgnores } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
    globalIgnores([
        "test/",
        "*.js",
        "*.mjs",
        "vitest.config.ts",
        "package.json"
    ]),
    ...obsidianmd.configs.recommended,
    {
        files: ["**/*.ts"],
        languageOptions: {
            parser: tsparser,
            parserOptions: { project: "./tsconfig.json" },
        },
        // Optional project overrides
        rules: {
            "obsidianmd/ui/sentence-case": [
                "warn",
                {
                    brands: ["Task Collector", "xX", "YYYY-MM-DD", "Live Preview", "Obsidian", "Reading", " #(todo|task)"],
                    acronyms: ["TC"],
                    enforceCamelCaseLower: true,
                },
            ],
        },
    },
]);
