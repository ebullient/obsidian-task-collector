// jsdom doesn't provide activeWindow; point it at the test window
(globalThis as typeof globalThis & { activeWindow: Window }).activeWindow = window;
