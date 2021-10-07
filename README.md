# Obsidian: Task Collector
[![GitHub tag (Latest by date)](https://img.shields.io/github/v/tag/ebullient/obsidian-task-collector)](https://github.com/ebullient/obsidian-task-collector/releases) ![GitHub all releases](https://img.shields.io/github/downloads/ebullient/obsidian-task-collector/total?color=success)

Yet another plugin to manage completed tasks. ;)

## How to install

1. Go to **Community Plugins** in your [Obsidian](https://www.obsidian.md) settings and **disable** Safe Mode
2. Click on **Browse** and search for "task collector"
3. Click install
4. "Enable" the plugin directly after installation, or use the toggle on the community plugins tab to enable the plugin after it has been installed.

## Commands

- **Complete Task**  
    1. If the current line is a task, and it matches the configuration for an incomplete task (where values other than ` ` are valid), it will mark the item as complete (`[x]`). 
    2. Optional: Remove characters matching a configured regular expression from the task, e.g. remove a #task or #todo tag.
    3. Optional: Append a formatted date string to the task

- **Cancel Task** (if enabled)  
    1. If the current line is a task, and it matches the configuration for an incomplete task (where values other than ` ` are valid), it will mark the item as canceled (`[-]`). 
    2. Optional: Remove characters matching a configured regular expression from the task, e.g. remove a `#task` or `#todo` tag.
    3. Optional: Append a formatted date string to the task

-  **Reset Task** (as of 0.5.0)
    1. If the current line is a task, and it matches the configuration for a completed task (`[x]` or `[-]` if support for canceled tasks is enabled), it will reset it (`[ ]`). 
    2. If an append date format string is configured, appended text that matches the configured format will be removed.

- **Move completed tasks to configured heading**  
    For the current document (open, in edit mode), move any completed (or canceled) tasks into the specified section. It will insert the items after the header (most recent at the top). The section heading will be created if it isn't present, and will stop at the next heading or `---` separator.
    
- **Complete all tasks** (as of 0.4.0)
    For the current document (open, in edit mode), apply the **Complete item** command to all tasks matching the configuration for an incomplete task as complete (`[x]`). 

-  **Reset all completed tasks** (as of 0.4.0)
    For the current document (open, in edit mode), find each completed item that is not in the completed area, and mark it as incomplete (`[ ]`). If an append date format string is configured, appended text that matches the configured format will be removed.
    
## Settings

### Completing tasks

- Toggle **Support canceled tasks**  
  Use a `[-]` to indicate a canceled tasks. Canceled tasks are processed in the same way as completed tasks using options below.
  - default: disabled

- **Append date to completed task**
    - default: (empty string, disabled)
    - example: `[(]YYYY-MM-DD[)]`, results in `(2021-09-27)`
    - When a [moment.js date format](https://momentjs.com/docs/#/displaying/format/) is specified, the current date/time will be appended to the task text.

- **Remove text in completed (or canceled) task**  
    Remove text matching this [regular expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions) from the task text. 
    - default: (empty string, disabled)
    - example: `#(task|todo)` (remove #task or #todo tags)
    - The global flag, 'g' is applied to a per-line match.
    - *Be careful!* Test your expression before using it. There are several [online](https://www.regextester.com/) [tools](https://regex.observepoint.com/) that can help.

- **Incomplete task indicators**  
    Specify the set of characters that indicate incomplete tasks.
    - default: ` ` (space)
    - example: `> ?!` (a space is included along with other values)
    - The "Complete task" and "Cancel task" commands are careful to work only with incomplete tasks. This setting allows checkboxes with other single character values to be treated as incomplete tasks. This is often used for bujo style tasks, e.g. `[>]` for deferred items or `[/]` for items in progress.

### Moving completed tasks to a sub-section

- **Completed area header**  
    Completed (or canceled) items will be inserted under the specified header (most recent at the top).
    - default: `## Log`
    - Notes:
      - The default value will be used if the command is invoked and the configured value is empty. 
      - The heading will be created at the end of the document if it does not exist.
      - When scanning the document for completed (or canceled) tasks, the contents from this configured header to the next heading or separator (`---`) will be ignored.
      - Completed (or canceled) tasks will be moved along with their sub items (nested lists, text, or quotes). 
      - If a completed item has an incomplete child task, the child (and any text following) will remain in the original location.

## Right-click editor menu items

- **Toggle: Add menu item for completing task**  
  Add an item to the _right-click menu in edit mode_ to mark the task on the current line complete. If canceled items are supported, an additional menu item will be added to cancel the task on the current line.

- **Toggle: Add menu item for moving completed tasks**  
  Add an item to the _right-click menu in edit mode_ to move all completed (or canceled) tasks to the Completed area.
  
- **Toggle: Add menu items for marking or clearing all tasks**  (as of 0.4.0)
  Add two items to the _right-click menu in edit mode_ : one to complete
  all incomplete tasks in the document, and the other to reset or clear the status of all completed items in the document outside of the completed area.
  
## Credits

- [Completed Area Plugin](https://github.com/DahaWong/obsidian-completed) -- general premise of moving completed tasks to a different area within the document (delimited by a heading).
- [JeppeKlitgaard/ObsidianTweaks](https://github.com/JeppeKlitgaard/ObsidianTweaks/) -- simple/clear event triggers
- [ivan-lednev/obsidian-task-archiver](https://github.com/ivan-lednev/obsidian-task-archiver) -- Treatment of sub-elements
- [Darakah/obsidian-timelines](https://github.com/Darakah/obsidian-timelines) -- Editor select/replace
- [Customizable Sidebar](https://github.com/phibr0/obsidian-customizable-sidebar) -- GH Action
- [Dataview](https://github.com/blacksmithgu/obsidian-dataview) -- Jest/Testing
- [Bootstrap Icons](https://icons.getbootstrap.com/)
