# Obsidian: Task Collector
[![GitHub tag (Latest by date)](https://img.shields.io/github/v/tag/ebullient/obsidian-task-collector)](https://github.com/ebullient/obsidian-task-collector/releases) ![GitHub all releases](https://img.shields.io/github/downloads/ebullient/obsidian-task-collector/total?color=success)

Yet another plugin to manage completed tasks. ;)

## Commands

- **Complete item**  
    1. If the current line is a task, and it matches the configuration for an incomplete task (where values other than ' ' are valid), it will mark the item as complete ('x'). 
    2. Optional: Remove characters matching a configured regular expression from the task, e.g. remove a #task or #todo tag.
    3. Optional: Append a formatted date string to the task

- **Cancel item** (if enabled)  
    1. If the current line is a task, and it matches the configuration for an incomplete task (where values other than ' ' are valid), it will mark the item as canceled ('-'). 
    2. Optional: Remove characters matching a configured regular expression from the task, e.g. remove a #task or #todo tag.
    3. Optional: Append a formatted date string to the task

- **Move completed tasks to configured heading**  
    For the current document (open, in edit mode), move any completed (or canceled) tasks into the specified section. It will insert the items after the header (most recently moved will be first). The section heading will be created if it isn't present, and will stop at the next heading or `---` separator.
## Settings

### Completing tasks

- **Support canceled tasks**  
  Use a `-` to indicate a canceled tasks. Canceled tasks are processed in the same way as completed tasks using options below.

- **Append date to completed task**
    - default: (empty string, disabled)
    - example: `[(]YYYY-MM-DD[)]`, results in `(2021-09-27)`
    - When a [moment.js date format](https://momentjs.com/docs/#/displaying/format/) is specified, the current date/time will be appended to the task text.

- **Remove text in completed (or canceled) task**  
    Remove text matching this [regular expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions) from the task text. 
    - default: (empty string, disabled)
    - example: `#(task|todo)` (remove #task or #todo tags)
    - The global flag, 'g' is applied to a per-line match.
    - *Be careful!* Test your expression before using it. There are several [online](https://www.regextester.com/) [tools](https://regex.observepoint.com/) can help.

- **Incomplete task indicators**  
    Specify the set of characters that indicate incomplete tasks.
    - default: ` ` (space)
    - example: `> ?!` (a space is included along with other values)
    - The "Complete task" and "Cancel task" commands are careful to work only with incomplete tasks. This setting allows checkboxes with other single character values to be treated as incomplete tasks. 

### Moving completed tasks to a sub-section

- **Completed area header**  
    Completed (or canceled) items will be inserted under the specified header (most recent at the top).
    - default: `## Log`
    - Notes:
      - The default value will be used if the command is invoked and the configured value is empty. 
      - The heading will be created at the end of the document if it does not exist.
      - When scanning the document for completed (or canceled) tasks, the contents from this configured header to the next heading or separator (---) will be ignored.
      - Completed (or canceled) tasks will be moved along with their sub items (nested lists, text, or quotes). 
      - If a completed item has a nested-incomplete child, the child (and any text following) will remain in the original location.

## Right-click editor menu items

- **Toggle: Add menu item for completing task**  
  Add an item to the right-click menu in edit mode to mark the task on the current line complete. If canceled items are supported, an additional menu item will be added to cancel the task on the current line.

- **Toggle: Add menu item for moving completed tasks**  
  Add an item to the right-click menu in edit mode to move all completed (or canceled) tasks.
  
## Credits

- [Completed Area Plugin](https://github.com/DahaWong/obsidian-completed) -- general premise of moving completed tasks to a different area within the document (delimited by a heading).
- [JeppeKlitgaard/ObsidianTweaks](https://github.com/JeppeKlitgaard/ObsidianTweaks/) -- simple/clear event triggers
- [ivan-lednev/obsidian-task-archiver](https://github.com/ivan-lednev/obsidian-task-archiver) -- Treatment of sub-elements
- [Darakah/obsidian-timelines](https://github.com/Darakah/obsidian-timelines) -- Editor select/replace
- [Customizable Sidebar](https://github.com/phibr0/obsidian-customizable-sidebar) -- GH Action
