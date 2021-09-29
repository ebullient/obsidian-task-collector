# Obsidian: Task Collector

Yet another plugin to manage completed tasks. ;)

## Commands

- **Mark item complete**  
    1. If the current line is a task, and it matches the configuration for an incomplete task (where values other than ' ' are valid), it will mark the item as complete ('x'). 
    2. Optional: Remove characters matching a configured regular expression from the task, e.g. remove a #task or #todo tag.
    3. Optional: Append a formatted date string to the task

- **Move completed tasks to configured heading**  
    For the current document (open, in edit mode), move any completed tasks into the specified section. It will insert the items after the header (most recently moved will be first). The section heading will be created if it isn't present, and will stop at the next heading or `---` separator.
## Settings

### Completing tasks

- **Incomplete task data**  
    Specify the set of characters that mark incomplete tasks.
    - default: ` ` (space)
    - example: `> ?!` (a space is included alongside other values)
    - Note: This allows checkboxes with other single character values to be treated as incomplete (so they can be completed).

- **Append date to completed task**
    - default: (empty string, disabled)
    - example: `[(]YYYY-MM-DD[)]`, results in `(2021-09-27)`
    - When a [moment.js date format](https://momentjs.com/docs/#/displaying/format/) is specified, the current date/time will be appended to the task description when marking it complete.

- **Remove text in completed task**  
    Remove text matching this [regular expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions) from the completed item. 
    - default: (empty string, disabled)
    - example: `#(task|todo)` (remove #task or #todo tags)
    - The global flag, 'g' is applied to a per-line match.
    - *Be careful!* Test your expression before using it. There are several [online](https://www.regextester.com/) [tools](https://regex.observepoint.com/) that can help, though I would watch what you share in those boxes.

### Moving completed tasks to a sub-section

- **Completed area header**  
    Heading to contain completed items. The plugin will move/insert completed items under this heading. 
    - default: `## Log`
    - Notes:
      - The heading will be created at the end of the document if it does not exist.
      - The heading can not be empty. The default value will be used if an empty string is configured. 
      - Completed tasks will be moved along with its sub items (nested lists, text, or quotes). Things may go astray if you have mixed/inconsistent whitespace, so have the undo button ready. If a completed item has a nested-incomplete child, the child (and any text following) will remain.

## Right-click editor menu items

- **Toggle: Add menu item for completing task**  
  Add an item to the right-click menu in edit mode to mark an item complete

- **Toggle: Add menu item for moving completed tasks**  
  Add an item to the right-click menu in edit mode to move completed tasks
## Credits

- [Completed Area Plugin](https://github.com/DahaWong/obsidian-completed) -- general premise of moving completed tasks to a different area within the document (delimited by a heading).
- [JeppeKlitgaard/ObsidianTweaks](https://github.com/JeppeKlitgaard/ObsidianTweaks/) -- simple/clear event triggers
- [ivan-lednev/obsidian-task-archiver](https://github.com/ivan-lednev/obsidian-task-archiver) -- Treatment of sub-elements
- [Darakah/obsidian-timelines](https://github.com/Darakah/obsidian-timelines) -- Editor select/replace
- [Customizable Sidebar](https://github.com/phibr0/obsidian-customizable-sidebar) -- GH Action
