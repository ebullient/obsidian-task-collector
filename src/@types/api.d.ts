export class API {
    /**
     * Return completed task values as a string.
     * Will be "x", "xX", "x-", or "xX-"
     */
    getCompletedTaskValues(): string;

    /**
     * Return incomplete task values as a string.
     * Minimally " ", but could be any other combination of characters, like " >?/123!"
     */
    getIncompleteTaskValues(): string;

    /**
     * Return true if the provided value marks a completed (or canceled) item.
     */
    isComplete(value: string): boolean;

    /**
     * Return true if the provided value marks a canceled item (-).
     */
    isCanceled(value: string): boolean;

    /**
     * Async method that displays a modal menu containing potential task
     * completion candidates.
     *
     * Returns the selected "mark" (character) as a string.
     */
     getMark(): Promise<string>;
}
