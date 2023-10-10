# Task Collector Configuration

This doc will give a high level overview of how Task Collector works, and its core configuration elements. 

- [General Options](#general-options)
- [Task Groups](#task-groups)
- [Menus and modals](#menus-and-modals)

For readability, we've broken some things into their own docs:

- [Task Collection](TaskCollection.md)
- [Appending text to lines (not tasks)](AppendingText.md)

Other references: 

- [Why marks?](../README.md#why-mark)
- [Task mark selection](../README.md#task-mark-selection)
- [Marking tasks](../README.md#marking-tasks)

---

## General options

- **Toggle: Task collection**  
    This option enables [Task collection](TaskCollection.md). Additional settings will be available if this is enabled.
    - *default*: disabled  

<!-- -->
- **Define task mark cycle** _(optional)_  
    Use this option to specify a string of marks that can be iterated sequentially using `(TC) Mark previous` and `(TC) Mark next` commands.
    - *default*: (empty string, disabled)
    - **Notes**:
      - `(TC) Mark previous` and `(TC) Mark next` are not registered unless or until a task mark cycle is defined.

<!-- -->
- **Toggle: Convert non-list lines**  (✨ 1.0.4)
    Convert lines that are not tasks into tasks when you mark them.
    - *default*: disabled

<!-- -->
- **Skip matching sections** _(optional)_  (✨ 1.0.13)
    When collecting tasks, skip any sections that match the specified pattern.
    - *default*: (empty string, disabled)
    - **Notes**:
        - *Be careful!* Test your expression before using it. There are several [online](https://www.regextester.com/) [tools](https://regex.observepoint.com/) that can help.

<!-- -->

---

## Task groups

One or more task marks can be configured together in a group.

- `default` is a special group that can not be deleted. Any mark that is not included in any other group uses the default group settings.
- `text` is a special name used for [appending text](AppendingText.md).

### Task group configuration

- **Group name** _(required)_  
    Each group should have a unique name. The names are significant only as an identifier.
  - **Toggle: Complete**  
        Enable this toggle if this group of marks indicate [completed tasks](../README.md#completed-tasks).

<!-- -->
- **Task marks** _(required)_  
    Tasks are specified as a contiguous string: ` !/?r`
    - **Notes**:
      - A mark can only belong to one group. 
      - A `space` is a valid character. If a space is present, `⎵` is drawn (CSS) as an eye-catcher.
      - The string will sort itself as you add characters to it.

<!-- -->  
- **Append date to selected task(s)**  _(optional)_
    - *default*: (empty string, disabled)
    - *example*: `[(]YYYY-MM-DD[)]`, results in `(2021-09-27)`
    - **Notes**:
      - When a [moment.js date format](https://momentjs.com/docs/#/displaying/format/) is specified, the current date/time will be appended to the task text.
      - Use square brackets to surround content that is not part of the format string. 
      - When working with dataview-friendly annotations, for example, your format string should look something like this: `[[completion::]YYYY-MM-DD[]]`.
      - See [marking tasks](../README.md#marking-tasks)

<!-- -->  
- **Remove text matching pattern**  
    Remove text matching this [regular expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions) from the task text. 
    - *default*: (empty string, disabled)
    - *example*: `#(task|todo)` (remove #task or #todo tags)
    - **Notes**:
        - *Be careful!* Test your expression before using it. There are several [online](https://www.regextester.com/) [tools](https://regex.observepoint.com/) that can help.
        - Aside from an immediate "undo", this is not a reversible operation.
        - See [marking tasks](../README.md#marking-tasks)

<!-- -->    
- **Toggle: Register '(TC) Mark with... ' command**  
    Register a command _for each mark in the group_.  
    - *default*: `false`
    - **Notes**:
      - Commands can be bound to hot-keys... 

<!-- -->    
- **Toggle: Add '(TC) Mark with... ' menu item**  
    Register a right-click context menu item _for each mark in the group_. 
    - *default*: `false`

<!-- -->    
- **Area heading** _(if [task collection](TaskCollection.md) is enabled)_  
    Matching marked items will be inserted under the specified heading (most recent at the top).  
    - *default*: (empty string, disabled)
    - **Notes**:
        - The area heading must be defined to enable collection for the group.
        - See [task collection](TaskCollection.md) for details.

<!-- -->    
- **Toggle: Remove checkbox**  _(if [task collection](TaskCollection.md) is enabled)_  
    Remove the checkbox marked tasks during the move to the configured area. 
    - *default*: false

---

## Menus and modals

- **Toggle: Prompt on checkbox click in Reading or Live preview**:  
    When true, the [Task mark selection dialog](../README.md#task-mark-selection) will be opened when you click on a checkbox in Reading or Live Preview mode.
    - *default*: `false`
    - **Notes**:
      - This may conflict with a similar handler from the [Tasks](https://obsidian-tasks-group.github.io/obsidian-tasks/) plugin. Use one or the other, not both.

<!-- -->    
- **Toggle: Add '(TC) Mark task' menu item** (✨ 0.6.4)
    Add an item to the right-click menu in edit mode to mark the task _on the current line (or within the current selection)_. It will open the [Task mark selection dialog](../README.md#task-mark-selection).
    - *default*: `false`

<!-- -->    
- **Toggle: Add '(TC) Collect tasks' menu item** _(if [task collection](docs/../TaskCollection.md) is enabled)_  
    Add an item to the right-click menu to collect tasks in the current note.
    - *default*: `false`

