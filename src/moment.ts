import { moment } from "obsidian";

export const momentFn = ("default" in moment
    ? moment.default
    : moment) as unknown as typeof moment;
