# Obsidian: Task Collector
[![GitHub tag (Latest by date)](https://img.shields.io/github/v/tag/ebullient/obsidian-task-collector)](https://github.com/ebullient/obsidian-task-collector/releases) ![GitHub all releases](https://img.shields.io/github/downloads/ebullient/obsidian-task-collector/total?color=success)

Yet another plugin to manage completed tasks, but this one has a task-completion modal to go with it!

## How to install

1. Go to **Community Plugins** in your [Obsidian](https://www.obsidian.md) settings and **disable** Safe Mode
2. Click on **Browse** and search for "task collector"
3. Click install
4. Use the toggle on the community plugins tab to enable the plugin.

## TL;DR for task completion

1. Open Plugin settings
2. Edit the task marks for the `default` group to include any characters you use for incomplete tasks.
3. Edit the task marks for the `complete` group to include any characters you use for completed tasks.
4. Scroll down to find **Menus and Modals**, and enable the context menus you prefer.

Use the [(TC) Mark task](#tc-mark-task) command from the command palette, or the right-click menu (shown in the clip), or bind it to a hot key. 

![Task Completion](https://user-images.githubusercontent.com/808713/148706433-34d21845-a441-428d-a24c-380c6db457c7.gif)

## Task Groups

Marking tasks is configured in groups:

- Each group can have one or more marks associated with it
- Each group defines behavior for when that group is applied to a task:
  - If an _append date_ format is defined for the group:
    - A date string with that format will be appended to the end of the task when it is marked. 
    - If task collector changes the mark, the appended date string will be removed before the next mark is applied.
  - If a  _remove text_ pattern is defined for the group:
    - Text that matches the provided pattern will be removed when the task is marked. Aside from an immediate "undo", this is not a reversible operation.
  
## Commands

### (TC) Mark Task (✨ 0.6.4)

1. A dialog will pop up showing known task types in two groups: 
    - The first group contains marks for "completed" items.
    - The second group contains all other task marks, minimally a space (`[ ]`).
2. Use the mouse to select an icon, or type the associated character.

> Note:  
> - Is the pop-up not showing what you expect? Review the marks defined in your task groups.
> - You can use (type) characters that are not shown in the dialog. They will use the `default` group settings.

When the task is marked: 

1. Text appended by the previous mark will be removed (if it matches)
2. The task will be marked with the new mark
3. If a remove text pattern is configured, it will be applied to the task text.
4. If there is an append date format, a formatted time stamp will be appended to the task.  

### (TC) Collect tasks  (✨ 1.0.0)

Task Collector can gather and regroup different kinds of tasks into different areas within a note.

1. Enable "Task Collection" 
2. For the group of tasks that you would like to gather: 
    - Set a completion area header
    - Decide whether or not the checkbox should be removed when the task is relocated.

When you "Collect tasks", the following will happen: 

- Any missing area headings will be added to the end of the document.
- The document will be scanned from top to bottom, to find all configured headings
  - You can have more than one heading of each type in the note.
- Main note content:  
  - The main content (excluding collection areas) are scanned for tasks that should be moved
  - Tasks that are discovered will be moved to the next closesd matching section.
    - If a section is not found between the task and the end of the note, the search resumes from the top.
- Collection areas:
  - Collection areas are then scanned for tasks that should be moved to other areas, moving from the top down.

As an example, if you start with this:

```
- [ ] i1
- [x] one
- [>] two

## To Do

## Log
- [ ] i2
- [x] three
- [>] four

## Deferred
- [ ] i3
- [x] five
- [>] six
```

You can configure group collection so the result is this: 

```
## To Do
- [ ] i1
- [ ] i2
- [ ] i3

## Log
- [x] one
- [x] five
- [x] three

## Deferred
- [>] two
- [>] four
- [>] six
```

For this case specifically, set the area header for the **default** group to `"## To Do`,
create a new group called `deferred` that supports one mark (`>`) and uses `## Deferred` as an area header. Set the **complete** group area header to `## Log`.

 ---
## Settings

Settings have been overhauled for version 1.0

- Toggle **Enable task collection**  
    Use this toggle to enable task collection commands and show related options.
    - default: disabled

- **Task Groups**  
    Each task group defines a set of behaviors that should be applied when the associated marks are added or removed from a task.

  - **Append date to a marked task**
    - default: (empty string, disabled)
    - example: `[(]YYYY-MM-DD[)]`, results in `(2021-09-27)`
    - Notes:
      - When a [moment.js date format](https://momentjs.com/docs/#/displaying/format/) is specified, the current date/time will be appended to the task text.
      - Use square brackets to surround content that is not part of the format string. When working with dataview-friendly annotations, for example, your format string should look somethng like this: `[[completion::]YYYY-MM-DD[]]`.

  - **Remove text when a task is marked**  
    Remove text matching this [regular expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions) from the task text. 
    - default: (empty string, disabled)
    - example: `#(task|todo)` (remove #task or #todo tags)
    - Notes:
        - The global flag, 'g' is applied to a per-line match.
        - *Be careful!* Test your expression before using it. There are several [online](https://www.regextester.com/) [tools](https://regex.observepoint.com/) that can help.

  - **Toggle: Register command for marking a task**  
    Register a command to mark the task _on the current line (or within the current selection)_ with the first task mark associated with the group.
      - default: `false`

  - **Area heading** (if Task Collection is enabled)  
    Matching marked items will be inserted under the specified heading (most recent at the top).  
    
    - Notes:
        - The area heading must be defined to enable collection for the group.
        - The heading will be created at the end of the note if it does not exist.
        - When scanning the note for marked tasks, tasks with a matching mark found between the configured header and the next heading or separator (`---`) will be ignored.
        - Marked tasks will carry along their sub items (nested lists, text, or quotes). 
        - If a marked item has an incomplete child task, the child (and any text following) will remain in the original location.

  - **Remove the checkbox from moved items** (✨ 0.6.3, if Task Collection is enabled)
      Remove the checkbox marked tasks during the move to the configured area. 
      - This transforms tasks into normal list items. 
      - Task Collector will not be able to reset these items. They also will not appear in task searches or queries.
      - default: `false`
    
## Right-click editor menu items

- **Toggle: Add menu item for marking a task** (✨ 0.6.4)
  Add an item to the right-click menu in edit mode to mark the task _on the current line (or within the current selection)_. 
  
  This menu item will trigger a quick pop-up modal to select the desired mark value. You can select an value using a mouse or the keyboard. The selected value will determine follow-on actions: complete, cancel, or reset.

    - default: `false`
    - Notes:
        - Task Collector will use `[x]` or `[X]` to complete an item, and `[-]` to cancel an item (if that support has been enabled). It will use a space (`[ ]`) to reset the task, in addition to any of the additional task types.
        - If you enter an unknown value with the keyboard, nothing will happen. 

- **Toggle: Add menu item for moving all completed tasks**  
  Add an item to the right-click menu to move _all_ completed (or canceled) tasks.
    - default: `false`

## Credits

- [Completed Area Plugin](https://github.com/DahaWong/obsidian-completed) -- general premise of moving completed tasks to a different area within the note (delimited by a heading).
- [JeppeKlitgaard/ObsidianTweaks](https://github.com/JeppeKlitgaard/ObsidianTweaks/) -- simple/clear event triggers
- [ivan-lednev/obsidian-task-archiver](https://github.com/ivan-lednev/obsidian-task-archiver) -- Treatment of sub-elements
- [Darakah/obsidian-timelines](https://github.com/Darakah/obsidian-timelines) -- Editor select/replace
- [Customizable Sidebar](https://github.com/phibr0/obsidian-customizable-sidebar) -- GH Action
- [Dataview](https://github.com/blacksmithgu/obsidian-dataview) -- Jest/Testing
- [Bootstrap Icons](https://icons.getbootstrap.com/)


<a href="https://www.buymeacoffee.com/ebullient" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-blue.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>
