declare global {
    interface Window {
        moment: typeof import("moment");
    }
}

export {};
