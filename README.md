# Obsidian: Task Collector
[![GitHub tag (Latest by date)](https://img.shields.io/github/v/tag/ebullient/obsidian-task-collector)](https://github.com/ebullient/obsidian-task-collector/releases) ![GitHub all releases](https://img.shields.io/github/downloads/ebullient/obsidian-task-collector/total?color=success)

Yet another plugin to manage completed tasks. ;)

Task Collector commands are oriented around a somewhat archival notion of completed tasks. 

- **Completed tasks** are marked with `[x]`, `[X]`.
    - *Canceled tasks*, marked with `[-]`, can be added to this group in settings.
- Any other task is considered **incomplete** (or in-progress)

Task actions (see [Task states](#task-states))

- When a task is *completed* (assigned `[x]`, `[X]`, or optionally `[-]`): 
    - It can be annotated with additional data, e.g. ✅:: 2022-01-01
    - Text can be removed, e.g. #todo tags

- When a task is *reset* (assigned `[ ]` or other configured value):
    - Text matching the configured pattern for a completed task, e.g. ✅:: 2022-01-01, is removed.

---

* [Commands](#commands) 
* [Settings](#settings)

## How to install

1. Go to **Community Plugins** in your [Obsidian](https://www.obsidian.md) settings and **disable** Safe Mode
2. Click on **Browse** and search for "task collector"
3. Click install
4. "Enable" the plugin directly after installation, or use the toggle on the community plugins tab to enable the plugin after it has been installed.

## TL;DR for task completion

![Task Completion](https://user-images.githubusercontent.com/808713/148706433-34d21845-a441-428d-a24c-380c6db457c7.gif)

Update the following plugin settings

1. If you want *canceled* `[-]` items to behave like completed items, enable **Support Canceled Tasks**

1. Find **Additional Task Types**, and add any task characters you use other than `[x]`, `[X]`, `[ ]` (omit `[-]` if you enabled the above)

3. *Optional:* Scroll down to find **Toggle: Add menu item for marking a task**, and enable it to add a right-click menu item for marking tasks.

Use the [(TC) Mark task](#tc-mark-task) command from the command palette, or the right-click menu (shown in the clip), or bind it to a hot key. 

---

## Task states

For the following table, 
* assume that support for canceled items has been enabled, and 
* that `>` has been defined as an additional (incomplete) task type.

If a task starts in the first column, 
and we try using a command to set it to the value in the second column, 
we'll get the result in the third column. 

| Start |  Try  | Result |                                               | 
|-------|-------|--------|-----------------------------------------------|
| `[ ]` | `[>]` | `[>]`  | Value changed                                 |
| `[ ]` | `[-]` | `[-]`  | See [Cancel Task](#tc-cancel-task-if-enabled) |
| `[ ]` | `[x]` | `[x]`  | See [Complete Task](#tc-complete-task)        |
| `[>]` | `[ ]` | `[ ]`  | Value changed                                 |
| `[>]` | `[-]` | `[-]`  | See [Cancel Task](#tc-cancel-task-if-enabled) |
| `[>]` | `[x]` | `[x]`  | See [Complete Task](#tc-complete-task)        |
| `[-]` | `[ ]` | `[ ]`  | See [Reset Task](#tc-reset-task)              |
| `[-]` | `[>]` | `[>]`  | See [Reset Task](#tc-reset-task)              |
| `[-]` | `[x]` | `[-]`  | *No change. See below*                        |
| `[x]` | `[ ]` | `[ ]`  | See [Reset Task](#tc-reset-task)              |
| `[x]` | `[>]` | `[>]`  | See [Reset Task](#tc-reset-task)              |
| `[x]` | `[-]` | `[x]`  | *No change. See below*                        |

Note: **Completed** tasks won't be directly completed again, they must be reset first.

Completed tasks may be annotated with data, like `(✅ 2022-01-01)`. Task Collector will
not "re-complete" an already completed item to avoid overwriting or duplicating that annotation.
Completed items must be reset (which would clear that data if present), before being completed
again.

## Commands

### (TC) Mark Task (✨ 0.6.4)

1. A dialog will pop up showing known task types in two groups: 
    - The first group contains marks for "completed" items.
    - The second group contains all other task marks, minimally a space (`[ ]`).
2. Use the mouse to select an icon, or type the associated character.
3. What happens next depends on the state of the task and the selected character.
    - If this is a plain list item, it will be converted into an empty incomplete task: processing continues...
    - If an incomplete task is completed (`[x]`, `[X]`), see [Complete Task](#tc-complete-task)
    - If an incomplete task is canceled (`[-]`), see [Cancel Task](#tc-cancel-task-if-enabled)
    - If an item is reset (`[ ]` or _other_), see [Reset Task](#tc-reset-task)
    - If a completed item is completed or canceled, nothing happens.
    - If an unknown character is typed, nothing happens.

> Note:  
> Is the pop-up not showing what you expect? Review what you have set for **[Additional Task Types](#settings)**.

### (TC) Complete Task

If the current line is (or selection contains) a task, AND the task matches the configuration for an incomplete task:

1. It will mark the item as complete (`[x]` or `[X]` if selected). 
2. Optional: Remove characters matching a configured regular expression from the task, e.g. remove a `#task` or `#todo` tag.
3. If an append date format string is configured, append a formatted date string to the task.

### (TC) Cancel Task (if enabled)

If the current line is (or selection contains) a task, AND the task matches the configuration for an incomplete task:

1. It will mark the item as canceled (`[-]`). 
2. Optional: Remove characters matching a configured regular expression from the task, e.g. remove a `#task` or `#todo` tag.
3. If an append date format string is configured, append a formatted date string to the task

### (TC) Reset Task 

If the current line is (or selection contains) a task:

1. It will set it to `[ ]` or an otherwise selected value. 
2. If an append date format string is configured, appended text that matches the configured format will be removed.

<small>(as of 0.5.0)</small>

### (TC) Move completed tasks to configured heading

For the current document:

- Move any completed (or canceled) tasks into the specified section. Items will be inserted after the target header (most recent at the top). 
    
### (TC) Complete all tasks

For the current document:

- Apply the [Complete Task](#tc-complete-task) command to all incomplete tasks.
    
<small>(as of 0.4.0)</small>

### (TC) Reset all completed tasks

For the current document:

- Apply the [Reset Task](#tc-reset-task) command to all completed tasks that are _not in the (archival) completed area_.

<small>(as of 0.4.0)</small>
 
 ---
## Settings

- Toggle **Support canceled tasks**  
  Use a `[-]` to indicate a canceled tasks. Canceled tasks are processed in the same way as completed tasks.
  - default: disabled

- **Additional Task Types** (renamed in 0.6.5)
    Specify the set of single characters that indicate in-progress or incomplete tasks.
    - default: ` ` (space)
    - example: `> ?!` (a space is included along with other values)
    - Notes:
        - This is often used with bullet journal (bujo) style tasks, e.g. `[>]` for deferred items or `[/]` for items in progress. See [Task states](#task-states).
        - The pop-up dialog for marking tasks will create buttons in the order the characers are included in this string.

### Completing tasks

- **Append date to completed task**
    - default: (empty string, disabled)
    - example: `[(]YYYY-MM-DD[)]`, results in `(2021-09-27)`
    - Notes:
        - When a [moment.js date format](https://momentjs.com/docs/#/displaying/format/) is specified, the current date/time will be appended to the task text.
        - Use square brackets to surround content that is not part of the format string. When working with dataview-friendly annotations, for example, your format string should look somethng like this: `[[completion::]YYYY-MM-DD[]]`.

- **Remove text in completed (or canceled) task**  
    Remove text matching this [regular expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions) from the task text. 
    - default: (empty string, disabled)
    - example: `#(task|todo)` (remove #task or #todo tags)
    - Notes:
        - The global flag, 'g' is applied to a per-line match.
        - *Be careful!* Test your expression before using it. There are several [online](https://www.regextester.com/) [tools](https://regex.observepoint.com/) that can help.

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

- **Remove the checkbox from moved items** (✨ 0.6.3)
    Remove the checkbox from completed (or canceled) tasks during the move to the completed area. This transforms tasks into normal list items. Task Collector will not be able to reset these items. They also will not appear in task searches or queries.
    - default: `false`
    
## Right-click editor menu items

- **Toggle: Add menu item for marking a task** (✨ 0.6.4)
  Add an item to the right-click menu in edit mode to mark the task _on the current line (or within the current selection)_. 
  
  This menu item will trigger a quick pop-up modal to select the desired mark value. You can select an value using a mouse or the keyboard. The selected value will determine follow-on actions: complete, cancel, or reset.

    - default: `false`
    - Notes:
        - Task Collector will use `[x]` or `[X]` to complete an item, and `[-]` to cancel an item (if that support has been enabled). It will use a space (`[ ]`) to reset the task, in addition to any of the additional task types.
        - If you enter an unknown value with the keyboard, nothing will happen. 

- **Toggle: Add menu item for completing a task**  
  Add an item to the right-click menu in edit mode to mark the task _on the current line (or within the current selection)_ complete. If canceled items are supported, an additional menu item will be added to mark selected tasks as canceled.
    - default: `false`

- **Toggle: Add menu item for resetting a task** (💥 0.6.4)
  Add an item to the right-click menu in edit mode to reset the task _on the current line (or within the current selection)_.
    - default: `false`

- **Toggle: Add menu item for completing all tasks** (💥 0.6.4)
  Add an item to the right-click menu in edit mode to mark _all_ incomplete tasks in the current document complete.  If canceled items are supported, an additional menu item will be added to mark selected tasks as canceled.
    - default: `false`

- **Toggle: Add menu item for resetting all tasks** (💥 0.6.4)
  Add an item to the right-click menu to reset _all_ completed (or canceled) tasks.
    - default: `false`

- **Toggle: Add menu item for moving all completed tasks**  
  Add an item to the right-click menu to move _all_ completed (or canceled) tasks.
    - default: `false`

## Credits

- [Completed Area Plugin](https://github.com/DahaWong/obsidian-completed) -- general premise of moving completed tasks to a different area within the document (delimited by a heading).
- [JeppeKlitgaard/ObsidianTweaks](https://github.com/JeppeKlitgaard/ObsidianTweaks/) -- simple/clear event triggers
- [ivan-lednev/obsidian-task-archiver](https://github.com/ivan-lednev/obsidian-task-archiver) -- Treatment of sub-elements
- [Darakah/obsidian-timelines](https://github.com/Darakah/obsidian-timelines) -- Editor select/replace
- [Customizable Sidebar](https://github.com/phibr0/obsidian-customizable-sidebar) -- GH Action
- [Dataview](https://github.com/blacksmithgu/obsidian-dataview) -- Jest/Testing
- [Bootstrap Icons](https://icons.getbootstrap.com/)


<a href="https://www.buymeacoffee.com/ebullient" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-blue.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>
