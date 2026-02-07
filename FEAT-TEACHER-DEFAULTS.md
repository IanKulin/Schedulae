# Feature: Teacher Defaults

## Summary

Add a collapsible "defaults" panel below each teacher's name in the Main View. This panel allows users to quickly fill all blank cells for a teacher with a chosen student group, room, or subject.

## User Story

As a timetable administrator, I want to set default values for a teacher's schedule so that I can quickly populate common assignments (e.g., "Mr Green always uses Room 4B") without manually editing each cell.

## UI Design

### Location
- Directly below each teacher's name header cell, within the same column
- Part of the sticky header row area

### Collapsed State (Default)
```
┌─────────────────────┐
│ Mr Green         ▼  │  ← Toggle arrow indicates expandable
├─────────────────────┤
│ [Cell dropdowns...] │
```

### Expanded State
```
┌─────────────────────┐
│ Mr Green         ▲  │
├─────────────────────┤
│ ┌─────────────────┐ │
│ │ Student Group ▼ │ │  ← Dropdown (blank + all groups)
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ Room          ▼ │ │  ← Dropdown (blank + all rooms)
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ Subject       ▼ │ │  ← Dropdown (blank + all subjects)
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │     Apply       │ │  ← Button
│ └─────────────────┘ │
├─────────────────────┤
│ [Cell dropdowns...] │
```

### Behavior
1. **Toggle:** Clicking the arrow or header area expands/collapses the defaults panel
2. **Dropdowns:** Each dropdown defaults to blank (no selection)
3. **Apply Button:** When clicked:
   - For each dropdown with a non-blank selection:
     - Find all slots for this teacher where that field is currently blank/null
     - Set those fields to the selected value
   - Save the updated data
   - The cells update visibly in the grid
4. **After Apply:** Dropdowns reset to blank, panel remains expanded

## Technical Implementation

### Files to Modify

**`public/js/app.js`**

1. **Modify `renderMainView()`** (around line 526)
   - Update header cell creation to include the collapsible defaults panel
   - Add toggle button/arrow to teacher name header
   - Create defaults panel container (hidden by default)

2. **New function: `createDefaultsPanel(teacherId, data)`**
   - Creates the collapsible panel HTML structure
   - Three dropdowns using similar pattern to `createDropdown()` but without slot binding
   - Apply button
   - Returns the panel element

3. **New function: `toggleDefaultsPanel(teacherId)`**
   - Shows/hides the defaults panel for a teacher
   - Updates the toggle arrow direction

4. **New function: `applyTeacherDefaults(teacherId)`**
   - Reads selected values from the three dropdowns
   - Loads current timetable data
   - Filters slots by teacherId
   - For each selected default value, updates slots where that field is null
   - Saves data
   - Re-renders main view (or updates cells in place)

5. **Event delegation updates**
   - Add click handler for toggle buttons
   - Add click handler for Apply buttons

**`public/css/styles.css`**

1. **`.teacher-header`** - Wrapper for name + toggle
2. **`.defaults-toggle`** - The expand/collapse arrow button
3. **`.defaults-panel`** - The collapsible container
4. **`.defaults-panel.collapsed`** - Hidden state
5. **`.defaults-dropdown`** - Styling for the defaults dropdowns
6. **`.defaults-apply-btn`** - Styling for the Apply button

### Data Flow

```
User clicks Apply
       ↓
applyTeacherDefaults(teacherId)
       ↓
Read dropdown values (studentGroupId, roomId, subjectId)
       ↓
loadData() → get current timetable
       ↓
Filter: slots.filter(s => s.teacherId === teacherId)
       ↓
For each slot, for each selected default:
  if (slot[field] === null) slot[field] = selectedValue
       ↓
saveData(updatedData)
       ↓
renderMainView() or update cells in place
       ↓
Reset dropdowns to blank
```

### Grid Layout Considerations

The current grid structure places teacher headers in a single row. Adding the collapsible panel requires either:

**Option A: Expand header cell vertically**
- Header cell grows when expanded
- Simpler implementation
- May look slightly uneven if only one teacher is expanded

**Option B: Dedicated defaults row**
- Add a second row below headers for defaults panels
- All panels align horizontally
- More complex grid structure

**Recommendation:** Option A - simpler and matches the "under each teacher's name" requirement naturally.

### Implementation Steps

1. **Add CSS classes** for the new UI elements
2. **Refactor header cell creation** to include toggle and panel structure
3. **Implement `createDefaultsPanel()`** function
4. **Implement `toggleDefaultsPanel()`** function
5. **Implement `applyTeacherDefaults()`** function
6. **Add event delegation** for toggle and apply clicks
7. **Test** with various scenarios:
   - Apply with no selections (should do nothing)
   - Apply with one selection
   - Apply with multiple selections
   - Apply when some cells already have values (should skip them)
   - Apply when all cells already have values (should do nothing)

### Edge Cases

- **No blank cells:** Apply does nothing, no error
- **No selection made:** Apply does nothing, no error
- **Partial selection:** Only selected fields are applied
- **Panel state:** Not persisted; all panels collapsed on page load/refresh
