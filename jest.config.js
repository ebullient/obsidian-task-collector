module.exports = {
    preset: "ts-jest",
    testEnvironment: 'jsdom',
    moduleDirectories: ['node_modules', 'src', 'test'],
    moduleNameMapper: {
        "^moment-obsidian$": "<rootDir>/node_modules/obsidian/node_modules/moment/moment.js",
        "^obsidian$": "<rootDir>/test/mocks/obsidian.ts"
    },
    setupFiles: ['./test/setup.ts'],
    transform: {
        "^.+\\.tsx?$": ["ts-jest", { diagnostics: { ignoreCodes: [151002] } }],
    },
}
