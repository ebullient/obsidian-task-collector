# Task collection

Task collection works on the tasks within a note. 

Tasks that match a mark configured for collection will be gathered into the designated area of the note.

The `(TC) Collect Tasks` command or menu item triggers the following process:

1. Any missing Area headings will be added to the end of the document.
2. The document will be scanned from top to bottom to isolate discovered Area headings and their target sections.
3. General note content is scanned from top to bottom for tasks that should be collected. Each discovered task is moved to a block of pending tasks associated with the closest matching Area header ([where do tasks go](#where-do-tasks-go)?).
4. Collection target sections are then scanned (in order of appearance in the doc) for tasks that belong in a different section. Those are then added to the block of pending tasks for the closest matching Area header.
5. Finally, the document is reassembled. Area headings and their target sections are placed back into the document, with the pending block for each appearing immediately under the section header (most recent will be first).
 
 
If you walk through the above with the following example, you should end up with the tasks in the same order:

<table>
<tr><th>Before</th><th>After</th></tr>
<tr><td><pre><code>
- [ ] i1
- [x] one
- [>] two
&#20;
## To Do
&#20;
## Log
- [ ] i2
- [x] three
- [>] four
&#20;
## Deferred
- [ ] i3
- [x] five
- [>] six
</code></pre></td><td><pre><code>
## To Do
- [ ] i1
- [ ] i2
- [ ] i3
&#20;
## Log
- [x] one
- [x] five
- [x] three
&#20;
## Deferred
- [>] two
- [>] four
- [>] six
</code></pre></td></tr>
</table>

To test out this example: 

1. Enable task collection
2. Set the Area header for the `default` group to `## To Do`
3. Set the Area header for the `complete` group to `## Log`
4. Create a new group, `deferred`, that supports one mark (`>`) and uses `## Deferred` as an area header. 

Put the initial text in a note, and run `(TC) Collect Tasks`.

## Where do tasks go
 
You can have more than one heading of each type in the note.

If there are multiple sections of the same name, tasks that are discovered will be moved to the next (following) matching section. If a section is not found between the task and the end of the note, the search resumes from the top.
    
**Notes**:  

- Marked tasks will carry along their sub items (nested lists, text, or quotes). 
- If a marked item has an unmarked child task, the child (and any text following) *will remain in the original location*.

## Required configuration

- Task collection must be [enabled](README.md#general-options)

- An **Area heading** must be defined for a [task group](README.md#task-groups)  

    Specifying an area heading enables collection for tasks that use any of the marks in that group.
    
    - A new heading will be created at the end of the note if it does not exist.
    - Tasks with marks matching this group between this header and the next header or `---` will be ignored when collecting tasks (as they are already where they belong). 

## Optional configuration

- **Remove checkbox** for a [task group](README.md#task-groups)  
    Remove the checkbox marked tasks during the move to the configured area.
    
    This transforms tasks into normal list items. Task Collector will not be able to reset these items. They also will not appear in task searches or queries.

