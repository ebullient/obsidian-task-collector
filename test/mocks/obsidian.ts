import { Workspace, Vault, MetadataCache, FileManager, UserEvent } from "obsidian";
import moment from "moment-obsidian";
export { moment };

export const activeWindow = window;

export class App {

    /** @public */
    workspace: Workspace;

    /** @public */
    vault: Vault;
    /** @public */
    metadataCache: MetadataCache;

    /** @public */
    fileManager: FileManager;

    /**
     * The last known user interaction event, to help commands find out what modifier keys are pressed.
     * @public
     */
    lastEvent: UserEvent | null;

}
