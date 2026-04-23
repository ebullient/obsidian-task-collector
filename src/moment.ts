import { moment } from "obsidian";

type MomentFn = (...args: unknown[]) => moment.Moment;

export const momentFn =
    "default" in moment
        ? (moment as unknown as { default: MomentFn }).default
        : (moment as unknown as MomentFn);
