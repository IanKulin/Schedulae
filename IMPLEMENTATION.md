# Schedulae - Implementation Plan

This document outlines the implementation plan for the Schedulae MVP, broken down into manageable sprints. Each sprint builds incrementally on the previous work, delivering testable functionality at each stage.

---

## Sprint Overview

| Sprint | Focus | Duration Estimate |
|--------|-------|-------------------|
| 1 | Project Setup & Core Data Model | Small |
| 2 | Data Entry Page - Basic UI | Small |
| 3 | Data Entry Page - Validation & Persistence | Small |
| 4 | Main View - Grid Layout | Medium |
| 5 | Main View - Dropdowns & Editing | Medium |
| 6 | Main View - Auto-save & Polish | Small |
| 7 | Derived Views - Teacher Timetables | Medium |
| 8 | Derived Views - StudentGroup & Room | Small |
| 9 | Navigation & Final Polish | Small |

---

## Sprint 1: Project Setup & Core Data Model

### Goals
- Set up project structure
- Implement core data model and LocalStorage utilities
- Create basic HTML shell

### Tasks

#### 1.1 Project Structure
- [ ] Create `index.html` with basic HTML5 boilerplate
- [ ] Create `css/` directory with `styles.css`
- [ ] Create `js/` directory with modular JavaScript files:
  - `js/data.js` - Data model and LocalStorage operations
  - `js/app.js` - Main application logic
  - `js/utils.js` - Utility functions

#### 1.2 Data Model Implementation (`js/data.js`)
- [ ] Define constants for hardcoded days: `["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]`
- [ ] Implement `TimetableData` object structure matching DATASTRUCTURE.md
- [ ] Implement ID generation functions:
  - `generateEntityId(entityType)` - Scans existing IDs, returns next integer as string
  - `generateSlotId(day, period, teacherId)` - Returns `slot_{day}_{period}_{teacherId}`

#### 1.3 LocalStorage Operations (`js/data.js`)
- [ ] `loadData()` - Load from LocalStorage key `timetableData`, return parsed JSON or null
- [ ] `saveData(data)` - Save to LocalStorage, handle errors with console.error
- [ ] `hasExistingData()` - Check if data exists in LocalStorage

#### 1.4 Slot Pre-creation Logic
- [ ] `createSlotsForTeacher(teacherId, periods)` - Create slots for all day/period combinations
- [ ] `createAllSlots(teachers, periods)` - Batch create slots for all teachers

### Deliverables
- Working LocalStorage read/write
- Data model utilities tested via browser console
- Basic HTML page loads without errors

### Testing
- Manually test in browser console:
  - Save sample data, reload page, verify data loads
  - Generate IDs and verify uniqueness
  - Create slots and verify structure

---

## Sprint 2: Data Entry Page - Basic UI

### Goals
- Create the Data Entry form UI
- Implement page show/hide navigation
- Display existing data in form fields

### Tasks

#### 2.1 HTML Structure (`index.html`)
- [ ] Create page container structure with `data-page` attributes:
  - `<div id="page-data-entry">`
  - `<div id="page-main-view">`
  - `<div id="page-derived-views">`
- [ ] Add header with navigation placeholder

#### 2.2 Data Entry Form HTML
- [ ] Number input for "Number of Periods per Day" (default: 6)
- [ ] Textarea for "Teachers" with placeholder text
- [ ] Textarea for "Student Groups" with placeholder text
- [ ] Textarea for "Rooms" with placeholder text
- [ ] Textarea for "Subjects" with placeholder text
- [ ] Save button
- [ ] Cancel button (conditionally visible)

#### 2.3 Basic CSS (`css/styles.css`)
- [ ] Page visibility classes (`.page-hidden`, `.page-visible`)
- [ ] Form layout styling
- [ ] Label and input styling
- [ ] Textarea sizing (adequate height for multi-line input)
- [ ] Button styling

#### 2.4 Page Navigation (`js/app.js`)
- [ ] `showPage(pageId)` - Hide all pages, show specified page
- [ ] Initial page logic:
  - If no data exists → show Data Entry
  - If data exists → show Main View

#### 2.5 Populate Form with Existing Data
- [ ] On Data Entry page load, populate fields from LocalStorage:
  - Periods field (disabled if data exists)
  - Teacher names (one per line)
  - StudentGroup names (one per line)
  - Room names (one per line)
  - Subject names (one per line)

### Deliverables
- Data Entry form displays correctly
- Form populates with existing data
- Basic page switching works

### Testing
- First visit shows Data Entry with empty form
- Manually add data to LocalStorage, reload, verify form populates
- Verify periods field disables when data exists

---

## Sprint 3: Data Entry Page - Validation & Persistence

### Goals
- Implement input validation
- Save form data to LocalStorage
- Handle entity add/edit/delete logic

### Tasks

#### 3.1 Input Parsing (`js/data.js`)
- [ ] `parseTextareaToNames(text)` - Split by newlines, trim, filter empty lines
- [ ] Handle edge cases: extra whitespace, blank lines, trailing newlines

#### 3.2 Validation Functions (`js/data.js`)
- [ ] `validatePeriods(value)` - Must be positive integer
- [ ] `validateEntityNames(names)` - Returns array of errors:
  - Check for blank names after trim
  - Check for duplicates (case-sensitive)
  - Check for invalid characters (control chars, etc.)
- [ ] `validateAllInputs(formData)` - Aggregate validation

#### 3.3 Error Display (`js/app.js`)
- [ ] Create error message elements near each field
- [ ] `showFieldError(fieldId, message)` - Display inline error
- [ ] `clearFieldErrors()` - Clear all error messages
- [ ] CSS for error message styling (red text, etc.)

#### 3.4 Save Logic (`js/app.js`)
- [ ] Parse all form fields
- [ ] Run validation, display errors if any
- [ ] If valid:
  - Match existing entities by name
  - Generate IDs for new entities
  - Mark deleted entities (names removed from list)
  - Update slots referencing deleted entities (set field to null)
  - For first save: create all slots for all teachers
  - For subsequent saves: create slots for new teachers only
  - Save to LocalStorage
  - Navigate to Main View

#### 3.5 Cancel Logic
- [ ] Discard form changes
- [ ] Navigate to Main View
- [ ] Only show Cancel button when data exists

#### 3.6 Entity Management
- [ ] Implement entity matching by exact name
- [ ] Implement entity deletion (orphan handling)
- [ ] Implement new entity creation with ID generation

### Deliverables
- Form validates all inputs with inline errors
- Save creates/updates entities correctly
- Slot creation works for new teachers
- Deleted entities orphan their slots correctly

### Testing
- Submit empty form → see validation errors
- Submit valid data → data saves to LocalStorage
- Add new teacher → new slots created
- Remove teacher → slots have null teacherId references updated
- Duplicate names → validation error shown

---

## Sprint 4: Main View - Grid Layout

### Goals
- Implement the CSS Grid layout for the main editing view
- Display teacher names and day/period labels
- Implement sticky headers

### Tasks

#### 4.1 Grid HTML Structure (`index.html`)
- [ ] Main View container with:
  - Header area (navigation links)
  - Empty state message (conditionally shown)
  - Grid container

#### 4.2 Grid Generation (`js/app.js`)
- [ ] `renderMainViewGrid(data)` - Generate grid HTML:
  - Header row with teacher names
  - Body rows with day/period labels and cells
  - Use CSS Grid with appropriate template

#### 4.3 CSS Grid Layout (`css/styles.css`)
- [ ] Grid container with `display: grid`
- [ ] Column template: `[row-header] auto repeat(N, [teacher] 200px)`
- [ ] Row template: Auto for all rows
- [ ] Fixed cell dimensions (width: 200px, height: 80-100px)

#### 4.4 Sticky Headers
- [ ] Top row sticks on vertical scroll (`position: sticky; top: 0`)
- [ ] Left column sticks on horizontal scroll (`position: sticky; left: 0`)
- [ ] Corner cell sticks both ways (higher z-index)
- [ ] Proper z-index layering to prevent overlap issues

#### 4.5 Scrollable Viewport
- [ ] Container with `overflow: auto`
- [ ] Reasonable max-height/max-width for viewport

#### 4.6 Empty State
- [ ] Show "No data found" message when no teachers exist
- [ ] Hide grid, show prominent link to Data Entry
- [ ] Conditional rendering based on data state

### Deliverables
- Grid renders with correct structure
- Sticky headers work on scroll
- Empty state displays when appropriate
- Layout handles various teacher/period counts

### Testing
- Load with sample data → grid displays correctly
- Scroll horizontally → teacher headers stick
- Scroll vertically → day/period labels stick
- Load with no data → empty state message shown
- Test with 1 teacher, 5 teachers, 15 teachers

---

## Sprint 5: Main View - Dropdowns & Editing

### Goals
- Add dropdown menus to each cell
- Populate dropdowns with entity options
- Handle selection changes

### Tasks

#### 5.1 Cell Content Structure
- [ ] Each cell contains 3 stacked dropdowns:
  - StudentGroup dropdown
  - Room dropdown
  - Subject dropdown
- [ ] HTML structure with appropriate classes

#### 5.2 Dropdown Generation (`js/app.js`)
- [ ] `createDropdown(type, options, selectedId, slotId)` - Generate `<select>` element:
  - First option: blank ("—")
  - Remaining options: entity names in entry order
  - Set selected value based on slot data
- [ ] Attach data attributes for slot identification

#### 5.3 Populate Dropdowns
- [ ] Get all StudentGroups, Rooms, Subjects from data
- [ ] Maintain entry order for options
- [ ] Set correct initial selection from slot data

#### 5.4 Selection Handling
- [ ] Event delegation for dropdown changes
- [ ] `handleDropdownChange(event)`:
  - Identify slot from data attributes
  - Identify field type (studentGroupId, roomId, subjectId)
  - Update slot in data model
  - Mark data as dirty (for auto-save)

#### 5.5 Cell Styling
- [ ] Stack dropdowns vertically with spacing
- [ ] Ensure dropdowns fit within cell dimensions
- [ ] Style dropdown appearance (consistent sizing)

### Deliverables
- All cells have 3 dropdowns
- Dropdowns populate with correct options
- Selection changes update the data model
- Existing selections display correctly on load

### Testing
- Grid shows all dropdowns populated with options
- Select an option → verify data model updates
- Reload page → verify selections persist
- Add new entity via Data Entry → appears in dropdowns

---

## Sprint 6: Main View - Auto-save & Polish

### Goals
- Implement debounced auto-save
- Add navigation links
- Polish UI details

### Tasks

#### 6.1 Auto-save Implementation (`js/app.js`)
- [ ] `debounce(fn, delay)` utility function
- [ ] `saveChanges()` - Save current data to LocalStorage
- [ ] Debounced save with 500ms delay
- [ ] Call debounced save on every dropdown change
- [ ] Error handling with console.error

#### 6.2 Navigation Header
- [ ] Link to "Data Entry"
- [ ] Links to Derived Views:
  - "Teacher Timetables"
  - "StudentGroup Timetables"
  - "Room Timetables"
- [ ] Consistent header styling across pages

#### 6.3 Grid Polish
- [ ] Alternate row shading for readability (optional)
- [ ] Cell borders/dividers
- [ ] Header styling (background color, font weight)
- [ ] Hover states (subtle highlighting)

#### 6.4 Day/Period Labels
- [ ] Use abbreviated day names: Mon, Tue, Wed, Thu, Fri
- [ ] Format: "Mon - P1", "Mon - P2", etc.
- [ ] Clear visual hierarchy

### Deliverables
- Changes auto-save after 500ms of inactivity
- Navigation header fully functional
- Grid has polished, professional appearance

### Testing
- Make changes rapidly → single save occurs after pause
- Close browser, reopen → all changes persisted
- Navigate between pages → works correctly
- Visual review of grid appearance

---

## Sprint 7: Derived Views - Teacher Timetables

### Goals
- Implement Teacher Timetables index and individual grids
- Create reusable derived view components

### Tasks

#### 7.1 Derived Views HTML Structure
- [ ] Container for derived views section
- [ ] Sub-containers for:
  - Index list view
  - Individual timetable grid view
- [ ] Back navigation links

#### 7.2 Index Page (`js/app.js`)
- [ ] `renderDerivedViewIndex(entityType, entities)`:
  - Page title ("Teacher Timetables")
  - List of entity names as clickable links
  - "Back to Main View" link
- [ ] Click handler to show individual timetable

#### 7.3 Individual Timetable Grid
- [ ] `renderIndividualTimetable(entityType, entityId, data)`:
  - Grid with Days as columns (Mon-Fri)
  - Periods as rows (P1, P2, etc.)
  - Cell content based on entity type
- [ ] For Teacher view, cells show:
  - StudentGroup name
  - Room name
  - Subject name

#### 7.4 Data Filtering
- [ ] `getSlotsForEntity(entityType, entityId, slots)`:
  - Filter slots by teacherId (for teacher view)
  - Return matching slots
- [ ] Map slots to day/period grid positions

#### 7.5 Read-only Display
- [ ] Text-only cell content (no dropdowns)
- [ ] Empty cells show "—" or blank
- [ ] Clean, readable layout

#### 7.6 CSS for Derived Views
- [ ] Grid layout (5 columns for days)
- [ ] Sticky headers for days and periods
- [ ] Cell styling consistent with Main View
- [ ] Smaller overall grid (fewer columns)

### Deliverables
- Teacher Timetables index page works
- Individual teacher timetable displays correctly
- Navigation between index and individual views works
- Data displays accurately

### Testing
- Click "Teacher Timetables" → see list of teachers
- Click teacher name → see their timetable
- Verify slots display in correct day/period positions
- Empty slots show appropriately

---

## Sprint 8: Derived Views - StudentGroup & Room

### Goals
- Extend derived views for StudentGroup and Room timetables
- Refactor for code reuse

### Tasks

#### 8.1 Refactor Derived View Code
- [ ] Generalize `renderDerivedViewIndex()` for all entity types
- [ ] Generalize `renderIndividualTimetable()` for all entity types
- [ ] Configuration object for entity-specific display:
  - Which fields to show in cells
  - Page titles
  - Filter field

#### 8.2 StudentGroup Timetables
- [ ] Filter slots by `studentGroupId`
- [ ] Cell content shows: Teacher, Room, Subject
- [ ] Index and individual views

#### 8.3 Room Timetables
- [ ] Filter slots by `roomId`
- [ ] Cell content shows: Teacher, StudentGroup, Subject
- [ ] Index and individual views

#### 8.4 Handle Empty/Unassigned Cases
- [ ] StudentGroups not assigned to any slots → show empty timetable
- [ ] Rooms not assigned to any slots → show empty timetable
- [ ] Graceful display of partial data

### Deliverables
- StudentGroup Timetables fully functional
- Room Timetables fully functional
- Consistent behavior across all three derived view types

### Testing
- Navigate to each derived view type
- Verify correct filtering for each entity type
- Verify correct fields display in cells
- Test with unassigned entities

---

## Sprint 9: Navigation & Final Polish

### Goals
- Complete navigation system
- Final UI polish and consistency
- Testing and bug fixes

### Tasks

#### 9.1 Navigation Consistency
- [ ] Ensure all pages have proper header with navigation
- [ ] "Back to Main View" on all derived views
- [ ] "Back to [Entity Type] List" on individual timetables
- [ ] Active page indication in navigation

#### 9.2 UI Consistency
- [ ] Consistent spacing and margins across all pages
- [ ] Consistent typography (font sizes, weights)
- [ ] Consistent color scheme
- [ ] Button styling consistency

#### 9.3 Edge Cases
- [ ] Handle very long entity names (truncation or wrapping)
- [ ] Handle many entities (scroll behavior)
- [ ] Handle zero entities of a type gracefully

#### 9.4 Browser Testing
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari
- [ ] Test in Edge
- [ ] Fix any browser-specific issues

#### 9.5 Final Polish
- [ ] Remove any console.log statements (except error logging)
- [ ] Clean up commented code
- [ ] Verify all success criteria from specification
- [ ] Code cleanup and organization

### Deliverables
- Complete, polished MVP
- Works in all target browsers
- Meets all success criteria from specification

### Testing
- Complete user workflow: first-time user
- Complete user workflow: returning user
- Complete user workflow: adding entities mid-session
- Complete user workflow: correcting mistakes
- Cross-browser verification

---

## Appendix: File Structure

```
schedulae/
├── index.html              # Main HTML file
├── css/
│   └── styles.css          # All styles
├── js/
│   ├── data.js             # Data model and LocalStorage
│   ├── app.js              # Main application logic
│   └── utils.js            # Utility functions
├── SPECIFICATION.md        # App specification
├── DATASTRUCTURE.md        # Data model specification
├── IMPLEMENTATION.md       # This file
└── grid-demo.html          # CSS Grid demo
```

---

## Appendix: Key Functions Reference

### Data Layer (`js/data.js`)
- `loadData()` → TimetableData | null
- `saveData(data)` → boolean
- `hasExistingData()` → boolean
- `generateEntityId(entityType)` → string
- `generateSlotId(day, period, teacherId)` → string
- `createSlotsForTeacher(teacherId, periods)` → Slot[]
- `parseTextareaToNames(text)` → string[]
- `validateEntityNames(names)` → string[]

### UI Layer (`js/app.js`)
- `showPage(pageId)` → void
- `renderDataEntryForm(data)` → void
- `renderMainViewGrid(data)` → void
- `renderDerivedViewIndex(entityType, entities)` → void
- `renderIndividualTimetable(entityType, entityId, data)` → void
- `handleDropdownChange(event)` → void
- `saveChanges()` → void

### Utilities (`js/utils.js`)
- `debounce(fn, delay)` → function
- `$(selector)` → Element (query shorthand)
- `$$(selector)` → Element[] (query all shorthand)

---

## Notes

- Each sprint should be completable independently and result in testable functionality
- Prioritize functionality over polish in early sprints
- Browser console testing is acceptable for early sprints
- Visual testing should verify appearance at each stage
- Keep code modular to facilitate future enhancements
