# Obsidian: Task Collector
[![GitHub tag (Latest by date)](https://img.shields.io/github/v/tag/ebullient/obsidian-task-collector)](https://github.com/ebullient/obsidian-task-collector/releases) ![GitHub all releases](https://img.shields.io/github/downloads/ebullient/obsidian-task-collector/total?color=success)

Yet another plugin to manage completed tasks, but this one has a task-completion modal to go with it!

- [Configuration reference](docs/README.md)
- [Commands](#commands)
- [Marking tasks](#marking-tasks)
- [Task mark selection](#task-mark-selection)

## Installation

1. Go to **Community Plugins** in your [Obsidian](https://www.obsidian.md) settings and **disable** Safe Mode
2. Click on **Browse** and search for "task collector"
3. Click install
4. Use the toggle on the community plugins tab to enable the plugin.

## TL;DR for marking tasks

1. Open Plugin settings
2. Edit the task marks for the `default` group to include any characters you use for incomplete tasks.
3. Edit the task marks for the `complete` group to include any characters you use for completed tasks.
4. _(optional)_ Scroll down to find **[Menus and modals](docs/README.md#menus-and-modals]**, and enable additional context menus.

![Task Completion](https://user-images.githubusercontent.com/808713/148706433-34d21845-a441-428d-a24c-380c6db457c7.gif)

## Commands

Task Collector registers a few commands by default:

### (TC) Mark task

This is a hot-key bindable command for edit-mode that opens a modal dialog for [task mark selection](#task-mark-selection).

That snappy completion status you wanted is just a few taps away!

For Reading and Live Preview modes, see [menus and modals](docs/README.md#menus-and-modals).

### (TC) Collect tasks 

Task Collector can gather and regroup different kinds of tasks into different areas within a note.

1. [Enable "Task collection"](docs/README.md#general-options)
2. For the group of tasks that you would like to gather: 
    - Set an Area heading

See [Task collection](docs/TaskCollection.md) for details.

### '(TC) Mark previous' and '(TC) Mark previous'

If you configure a [Task mark cycle](docs/README.md#general-options), two commands will be registered that allow you to cycle forward or backward through the mark sequence.

## Marking tasks

When Task Collector marks a task:  

1. _(optional)_ Matched text appended by the previous mark will be removed 
2. The task will be marked with the new mark
3. _(optional)_ The remove pattern configured for the new mark will be applied to remove text from the task.
4. If there is an append date format, a formatted time stamp will be appended to the task.  

## Task mark selection

Use the `(TC) Mark task` command or right-click context menu (if enabled) to select a task mark using a quick pop-up modal. 

The modal contains marks configured in [task groups](docs/README.md#task-groups). 

- The top row contains marks for [completed tasks](#completed-tasks).
- All other configured marks appear in the next row (or rows, as the collection will wrap).

**Notes**:

- Select a value with your mouse, or the keyboard.
- The selected value will determine follow-on actions, see [marking tasks](#marking-tasks).
- Any character you choose will work. If it doesn't match a configured mark, the behavior from the `default` group will apply. 

> Tip:  
> - Is the pop-up not showing what you expect? Review the marks defined in your [task groups](docs/README.md#task-groups).

 ---

## Why `mark`?

There are not enough words. I chose _mark_, because it can mean the symbol itself (a mark), and also active action (you mark the task). The checkbox is the outer thing. Sometimes these characters indicate the status of a task, and some folks use these to mean something else entirely. So, `mark` it is. 

Naming things is hard.

### Completed tasks

Why is there is a toggle for completed tasks if these are all just marks? 

The complete toggle is essentially an indicator.

- In the mark selection dialog, those used to complete tasks appear in the top row. All others are (sorted) in the bottom row(s).

- Task Collector has an API that other plugins or your own scripts can use to determine if a mark indicates a complete task or not.

---

## Credits

- [Completed Area Plugin](https://github.com/DahaWong/obsidian-completed) -- general premise of moving completed tasks to a different area within the note (delimited by a heading).
- [JeppeKlitgaard/ObsidianTweaks](https://github.com/JeppeKlitgaard/ObsidianTweaks/) -- simple/clear event triggers
- [ivan-lednev/obsidian-task-archiver](https://github.com/ivan-lednev/obsidian-task-archiver) -- Treatment of sub-elements
- [Darakah/obsidian-timelines](https://github.com/Darakah/obsidian-timelines) -- Editor select/replace
- [Customizable Sidebar](https://github.com/phibr0/obsidian-customizable-sidebar) -- GH Action
- [Dataview](https://github.com/blacksmithgu/obsidian-dataview) -- Jest/Testing

<a href="https://www.buymeacoffee.com/ebullient" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-blue.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>
