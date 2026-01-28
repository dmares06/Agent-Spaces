# Personal Tasks Usage Guide

## How to Access Personal Tasks

### Opening the Panel
1. Click the **orange CheckSquare (✓) button** in the top navigation bar
2. The Personal Tasks panel will appear at the bottom of the screen

### Closing the Panel (Going Back to Main View)
You have **two options** to close Personal Tasks and return to the main view:

1. **Toggle Button**: Click the orange CheckSquare button again (it toggles on/off)
2. **Close Button**: Click the **X button** in the top-right corner of the Personal Tasks panel header

## Important Notes

### Bottom Panel Design
Personal Tasks is implemented as a **bottom panel**, not a separate page. This means:
- It appears at the bottom of your workspace
- Similar to Terminal, Preview, and Canvas panels
- Only ONE panel can be open at a time
- Opening Personal Tasks automatically closes Terminal/Preview/Canvas
- Opening Terminal/Preview/Canvas automatically closes Personal Tasks

### Exclusive Panel Behavior
When you click any panel button:
- **Terminal** (blue) → Closes Personal Tasks, Preview, Canvas
- **Preview** (purple) → Closes Personal Tasks, Terminal, Canvas
- **Canvas** (green) → Closes Personal Tasks, Terminal, Preview
- **Personal Tasks** (orange) → Closes Terminal, Preview, Canvas

## Quick Start

### 1. Create Your First Task (Quick Add)
1. Open Personal Tasks panel
2. Type in the quick add input: `"Buy groceries"`
3. Press **Enter** or click **"+ Add Task"**
4. Task appears in "Want to Get Done" column

### 2. Create a Detailed Task
1. Click **"+ New Task"** button in the header
2. Fill in:
   - **Title**: What needs to be done
   - **Description**: Additional details
   - **Priority**: Low (green), Medium (yellow), High (red)
   - **Status**: Which column (Want to Get Done, Working On, Needs Review, Completed)
   - **Due Date**: Optional deadline
   - **Tags**: Custom labels (click Add after typing)
   - **Notes**: Extra context
3. Click **"Create Task"** or **"Save Changes"**

### 3. Move Tasks Between Columns
**Option A - Drag and Drop:**
- Click and hold a task card
- Drag it to another column
- Drop it in the new column

**Option B - Complete Button:**
- Click **"✓ Complete"** on any task
- Task instantly moves to "Completed" column

**Option C - Edit Modal:**
- Click **"Edit"** on a task
- Change the **Status** dropdown
- Click **"Save Changes"**

### 4. Edit a Task
1. Click **"Edit"** button on any task card
2. Modify any fields in the modal
3. Click **"Save Changes"**

### 5. Delete a Task
1. Click **"Delete"** button on any task card
2. Confirm the deletion prompt
3. Task is permanently removed

## Features Explained

### 4-Column Kanban Board
- **Want to Get Done** (Gray) - Your todo list
- **Working On** (Blue) - Tasks you're actively doing
- **Needs Review** (Purple) - Tasks waiting for review/verification
- **Completed** (Green) - Finished tasks

### Priority Indicators
Each task card has a colored bar on the left:
- **Red** = High priority
- **Yellow** = Medium priority
- **Green** = Low priority

### Due Date Warnings
- **Normal**: Due date shown in gray
- **Overdue**: Due date shown in **RED BOLD** with "(Overdue)" label

### Statistics Header
Real-time stats at the top:
- **Total**: Total number of tasks
- **Due Today**: Tasks due today (blue highlight)
- **Overdue**: Tasks past due date (red highlight)

### Tags
- Add custom labels to organize tasks
- First 2 tags show on task card
- Full tag list in edit modal

## Testing Other Panels

### Terminal Panel
1. Click the **blue Terminal button** in top nav
2. Terminal opens at bottom (Personal Tasks closes)
3. Click Terminal button again or **X** to close

### Preview Panel
1. Click the **purple Monitor button** in top nav
2. Live preview opens at bottom (Personal Tasks closes)
3. Click Preview button again or **X** to close

### Canvas Panel
1. Click the **green Palette button** in top nav
2. Canvas opens at bottom (Personal Tasks closes)
3. Click Canvas button again or **X** to close

## Troubleshooting

### Error: "Cannot read properties of undefined"
This happens if the Electron app wasn't fully restarted after installation.

**Solution:**
1. Quit the Electron app completely (Cmd+Q)
2. In terminal, run: `npm run electron:dev`
3. Wait for app to fully load
4. Try Personal Tasks button again

### Panel Not Appearing
**Check:**
1. Is another panel already open? (Close it first)
2. Click the orange CheckSquare button
3. Look at the bottom of the screen

### Tasks Not Saving
**Verify:**
1. Tasks are saved to SQLite database at:
   ```
   ~/Library/Application Support/AgentSpaces/agent-spaces.db
   ```
2. Check browser console for errors (Cmd+Option+I)
3. Restart the app

## Keyboard Shortcuts

Currently no keyboard shortcuts for Personal Tasks, but these work:
- **Ctrl+\`** → Toggle Terminal panel
- **Cmd+Q** → Quit app
- **Cmd+Option+I** → Open DevTools

## Database Location

All personal tasks are stored in:
```
~/Library/Application Support/AgentSpaces/agent-spaces.db
```

This is a SQLite database file. Tasks persist between app sessions.

## Real-Time Updates

Personal Tasks supports real-time updates:
- Create a task → Instantly appears in board
- Move a task → Column counts update immediately
- Delete a task → Removed from board instantly
- Complete a task → Moves to Completed column

If you have multiple windows open, changes sync across all windows automatically.

## Best Practices

1. **Use Quick Add** for simple tasks without details
2. **Use New Task Modal** for tasks needing priority, due dates, tags
3. **Drag and Drop** for fast status changes
4. **Complete Button** for quick completion
5. **Use Tags** to categorize related tasks
6. **Set Due Dates** for time-sensitive tasks
7. **Add Notes** for context you'll need later

## Common Workflows

### Daily Task Management
1. Open Personal Tasks panel
2. Review "Want to Get Done" column
3. Drag high-priority tasks to "Working On"
4. Complete tasks as you finish
5. Review "Completed" column at end of day

### Project-Based Work
1. Create tasks with project-specific tags (e.g., "website", "client-work")
2. Use priority levels to indicate urgency
3. Add detailed notes about requirements
4. Track progress across the 4 columns

### Weekly Planning
1. Create tasks for the upcoming week
2. Set due dates for each day
3. Check "Due Today" stat each morning
4. Monitor "Overdue" count to catch delays early

## Integration with Agent Workspace

Personal Tasks is fully integrated with your Agent Workspace:
- Works alongside Terminal, Preview, and Canvas
- Shares the same database as workspace data
- Accessible from any workspace
- Tasks persist across workspace switches

Note: Personal Tasks are **global** by default (not tied to a specific workspace). Future versions may support workspace-specific task filtering.
