# Scheduleae - School Timetabling Web Application - MVP Specification


## 1. Overview

### 1.1 Purpose
This document specifies the Minimum Viable Product (MVP) for a web-based school timetabling application named "Schedulae". The system allows users to create and view school timetables by managing teaching slots across teachers, student groups, rooms, and subjects.

### 1.2 Scope
The MVP focuses on:
- Basic data entry for timetable entities
- A main editing interface for assigning slots
- Read-only derived views for different perspectives (Teacher, StudentGroup, Room)
- Local browser storage for persistence

### 1.3 Target Users
- School administrators
- Timetable coordinators
- Desktop browser users

### 1.4 Core Principles
- Single source of truth: All data stored as atomic Slots
- No validation or conflict warnings in MVP
- Simple, functional interface
- Browser-based with no server dependency

---

## 2. Data Model

The application uses the data model defined in `DATASTRUCTURE.md` with the following clarifications:

### 2.1 Entity Naming
- **StudentGroup** (not "Class") - Represents a group of students that move through the timetable together
- **Teacher** - Teaching staff member
- **Room** - Physical teaching space
- **Subject** - Academic subject or course

### 2.2 Fixed Configuration
- **Days:** Hardcoded as Monday through Friday (5 days)
- **Periods:** Configurable at initial setup only (default: 6 periods per day). Cannot be changed after first save.

### 2.3 Data Structure
See `DATASTRUCTURE.md` for complete data model specification. Key points:
- Slot is the atomic unit, uniquely identified by (day, period, teacherId)
- Slots are pre-created for all Teacher/Day/Period combinations on first save
- Entities stored separately and referenced by ID
- Teacher is always assigned to a slot; StudentGroup, Room, and Subject are optional

---

## 3. User Interface

### 3.1 Application Structure

The application consists of three main pages:

1. **Data Entry Page** - Initial setup and entity management
2. **Main View** - Primary editing interface (Teacher × Day/Period grid)
3. **Derived Views** - Read-only timetables by Teacher, StudentGroup, or Room

### 3.2 Navigation

**Simple show/hide approach:**
- Only one page visible at a time
- Navigation via links/buttons in header
- No URL routing in MVP
- "Back to Main View" link available on all Derived Views

---

## 4. Data Entry Page

### 4.1 Purpose
Allow users to define the basic entities needed for timetabling.

### 4.2 Layout

The page contains a form with the following sections:

#### 4.2.1 Periods Configuration
- **Label:** "Number of Periods per Day"
- **Input:** Integer input field
- **Default value:** 6
- **Validation:** Must be a positive integer
- **Note:** This field is disabled after initial setup (when data already exists in LocalStorage)

#### 4.2.2 Teachers
- **Label:** "Teachers"
- **Input:** Multi-line text area
- **Format:** One teacher name per line
- **Example:**
  ```
  Ms Smith
  Mr Jones
  Dr Patel
  ```

#### 4.2.3 StudentGroups
- **Label:** "Student Groups"
- **Input:** Multi-line text area
- **Format:** One group name per line
- **Example:**
  ```
  9A
  9B
  10A
  10B
  ```

#### 4.2.4 Rooms
- **Label:** "Rooms"
- **Input:** Multi-line text area
- **Format:** One room name per line
- **Example:**
  ```
  Room 12
  Science Lab 1
  Gym
  ```

#### 4.2.5 Subjects
- **Label:** "Subjects"
- **Input:** Multi-line text area
- **Format:** One subject name per line
- **Example:**
  ```
  Mathematics
  English
  Science
  History
  PE
  ```

### 4.3 Actions

**Save Button:**
- Validates all inputs
- Generates unique IDs for new entities (by scanning existing IDs for highest number)
- For first-time save: Pre-creates slots for all Teacher/Day/Period combinations (with optional fields empty)
- For subsequent saves: Creates slots for any new teachers added
- Saves to LocalStorage
- Returns to Main View (or shows Main View for first-time users)

**Cancel Button:**
- Discards changes
- Returns to Main View (only shown if data already exists)

### 4.4 Validation Rules

#### 4.4.1 Entity Name Validation
- **Cannot be blank/empty** - Each line must contain at least one character
- **Cannot be duplicate** - No two entities of the same type can have identical names
- **JSON-safe characters only** - Avoid characters that complicate JSON serialization
  - Restrict: Control characters, excess whitespace
  - Allow: Letters, numbers, spaces, common punctuation (., -, ', etc.)

#### 4.4.2 Error Handling
- Display validation errors inline near the relevant field
- Prevent save until all validation passes
- Trim whitespace from entity names before validation
- Empty lines in text areas are ignored (not treated as errors)

### 4.5 Entity Management

#### 4.5.1 Adding Entities
- Users can return to Data Entry at any time
- New entities can be added to existing lists
- Changes take effect immediately after save

#### 4.5.2 Editing Entities
- Entity matching is by **exact name match only**
- If a name is changed, the old entity is treated as deleted and the new name creates a new entity with a new ID
- This means renaming "Ms Smith" to "Ms Smyth" will orphan slots that referenced "Ms Smith"

#### 4.5.3 Deleting Entities
- Remove line from text area to delete entity
- All Slots referencing deleted entities have that field set to blank/null
- No confirmation dialog in MVP

### 4.6 Initial State

**For new users (no data in LocalStorage):**
- Periods field: Pre-filled with "6"
- All text areas: Empty
- Only "Save" button visible (no Cancel)

**For returning users:**
- All fields populated with existing data
- Both "Save" and "Cancel" buttons visible

---

## 5. Main View

### 5.1 Purpose
Primary interface for creating and editing the timetable. Shows all possible Slots in a grid with teachers across the top and day/period combinations down the left side.

### 5.2 Grid Structure

**Columns:**
- Column 1: Row headers (Day/Period labels)
- Columns 2+: One column per Teacher

**Rows:**
- Row 1: Column headers (Teacher names)
- Rows 2+: One row per Day/Period combination

**Example for 3 teachers, 2 days, 2 periods:**
```
          | Ms Smith        | Mr Jones        | Dr Patel
----------|-----------------|-----------------|------------------
Mon - P1  | [dropdowns]     | [dropdowns]     | [dropdowns]
Mon - P2  | [dropdowns]     | [dropdowns]     | [dropdowns]
Tue - P1  | [dropdowns]     | [dropdowns]     | [dropdowns]
Tue - P2  | [dropdowns]     | [dropdowns]     | [dropdowns]
```

**Day abbreviations:** Mon, Tue, Wed, Thu, Fri

**Total rows:** 1 (header) + (5 days × N periods)  
**Total columns:** 1 (row header) + M teachers

### 5.3 Cell Content

Each cell (intersection of Teacher and Day/Period) represents one Slot.

Each cell contains **three dropdown menus, stacked vertically:**

1. **StudentGroup dropdown**
   - Options: Blank option + all StudentGroups
   - Blank option text: "—" or empty
   
2. **Room dropdown**
   - Options: Blank option + all Rooms
   - Blank option text: "—" or empty
   
3. **Subject dropdown**
   - Options: Blank option + all Subjects
   - Blank option text: "—" or empty

### 5.4 Dropdown Behavior

#### 5.4.1 Option Order
- Options appear in the order entities were entered in Data Entry
- Blank option always appears first

#### 5.4.2 Selection
- Each dropdown independent
- User can select any combination (including all blank)
- No restrictions or warnings about conflicts
- Setting a dropdown back to blank clears that field but keeps the slot (slots are never deleted)

#### 5.4.3 Initial State
- All dropdowns show blank/unassigned by default (slots are pre-created with optional fields empty)
- Previously saved selections appear when page loads

### 5.5 Visual Layout

**Sticky Headers:**
- Top row (teacher names) sticks when scrolling vertically
- Left column (day/period labels) sticks when scrolling horizontally
- Top-left corner cell sticks both directions

**Cell Sizing:**
- Fixed height per row (e.g., 80-100px to accommodate 3 dropdowns)
- Fixed width per column (e.g., 200px)
- Scrollable viewport for large timetables

### 5.6 Data Persistence

**Auto-save:**
- Changes saved automatically using debounced approach
- Debounce delay: 500ms after last dropdown change
- No explicit "Save" button
- No save confirmation message in MVP

**Error Handling:**
- If LocalStorage save fails, log error to console
- No user-facing error message in MVP

### 5.7 Empty State

**When first accessing Main View with no timetable data:**
- Display message: "No data found. Please go to Data Entry to set up your timetable."
- Provide prominent link/button to Data Entry page
- Do not show empty grid

### 5.8 Navigation

**Header area contains:**
- Link to "Data Entry"
- Links to Derived Views:
  - "Teacher Timetables"
  - "StudentGroup Timetables"
  - "Room Timetables"

---

## 6. Derived Views

### 6.1 Purpose
Provide read-only views of the timetable from different perspectives.

### 6.2 View Types

Three types of derived views, all following the same pattern:

1. **Teacher Timetables** - View slots assigned to each teacher
2. **StudentGroup Timetables** - View slots assigned to each student group
3. **Room Timetables** - View slots assigned to each room

### 6.3 Common Structure

Each derived view consists of:
1. **Index page** - List of all entities of that type
2. **Individual timetable grids** - One grid per entity

### 6.4 Index Page

**Layout:**
- Page title: "Teacher Timetables" (or StudentGroup/Room equivalent)
- List of all entities of that type
- Each entity name is a clickable link
- "Back to Main View" link in header

**Example for Teachers:**
```
Teacher Timetables
[Back to Main View]

• Ms Smith
• Mr Jones  
• Dr Patel
```

### 6.5 Individual Timetable Grid

**Grid Structure:**
- **Columns:** Days (Mon, Tue, Wed, Thu, Fri)
- **Rows:** Periods (P1 through PN)
- **Cells:** Display assigned entities
- **Format:** Same scrollable grid format as Main View, but smaller (5 columns vs many teachers)

**Layout example for Ms Smith:**
```
     | Mon        | Tue        | Wed        | Thu        | Fri
-----|------------|------------|------------|------------|------------
P1   | 9A         | 10B        |            | 9A         | 10A
     | Room 12    | Science Lab|            | Room 12    | Room 15
     | Maths      | Science    |            | Maths      | English
-----|------------|------------|------------|------------|------------
P2   | 9B         |            | 9A         |            |
     | Room 14    |            | Gym        |            |
     | English    |            | PE         |            |
```

### 6.6 Cell Content by View Type

**Teacher Timetables show:**
- StudentGroup name
- Room name
- Subject name

**StudentGroup Timetables show:**
- Teacher name
- Room name
- Subject name

**Room Timetables show:**
- Teacher name
- StudentGroup name
- Subject name

**Empty cells:**
- Display as blank or with a single "—" character
- No special styling

### 6.7 Data Filtering

For each entity's timetable:
1. Filter all Slots by the relevant entity ID
2. Group by day
3. Sort by period
4. Display only matching slots

**Example:** Teacher "Ms Smith" (id: "1")
- Find all Slots where `teacherId === "1"`
- Display those slots in day/period grid
- All other cells remain empty

### 6.8 Read-Only Behavior

- No editing controls in derived views
- No dropdowns or input fields
- Text-only display of entity names
- To edit, users must return to Main View

### 6.9 Navigation

**Each individual timetable grid includes:**
- "Back to [Teacher/StudentGroup/Room] List" link
- "Back to Main View" link in header

**Grid display:**
- Uses the same scrollable grid format as Main View
- Sticky headers for days (top) and periods (left)
- Smaller overall size (5 day columns vs many teacher columns)

---

## 7. Technical Requirements

### 7.1 Browser Support

**Target browsers (desktop only):**
- Chrome (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Edge (last 2 versions)

**Not supported:**
- Internet Explorer
- Mobile browsers (out of scope for MVP)

### 7.2 Data Storage

**LocalStorage:**
- Single key: `timetableData`
- Value: Complete JSON object containing all entities and slots
- Structure matches `DATASTRUCTURE.md` specification

**JSON Structure:**
```json
{
  "periods": [1, 2, 3, 4, 5, 6],
  "teachers": {
    "1": { "id": "1", "name": "Ms Smith" }
  },
  "studentGroups": {
    "1": { "id": "1", "name": "9A" }
  },
  "rooms": {
    "1": { "id": "1", "name": "Room 12" }
  },
  "subjects": {
    "1": { "id": "1", "name": "Mathematics" }
  },
  "slots": [
    {
      "id": "slot_monday_1_1",
      "day": "Monday",
      "period": 1,
      "teacherId": "1",
      "studentGroupId": "1",
      "roomId": "1",
      "subjectId": "1"
    }
  ]
}
```

**Note:** Days are hardcoded as `["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]` and not stored in the data structure.

### 7.3 ID Generation

**Requirements:**
- IDs must be unique within their entity type

**Entity ID format:**
- Auto-incrementing integers stored as strings: `"1"`, `"2"`, `"3"`, ...
- Each entity type (Teacher, Room, StudentGroup, Subject) maintains its own sequence starting at 1

**Slot ID format:**
- Derived from day, period, and teacherId: `slot_{day}_{period}_{teacherId}`
- Example: `slot_monday_1_1`
- Day is lowercase in the ID

**Entity ID generation approach:**
- Scan existing entities of the same type for the highest numeric ID
- Increment for new entities
- No separate counter storage required

### 7.4 Error Handling

**LocalStorage errors:**
- Log errors to browser console
- Examples:
  - `console.error("LocalStorage not available")`
  - `console.error("Failed to save timetable data:", error)`

**No user-facing error messages in MVP**

### 7.5 Performance Considerations

**Known limitations:**
- Large grids (e.g., 20 teachers × 30 periods = 600 cells × 3 dropdowns = 1800 DOM elements)
- No virtual scrolling in MVP
- Accept performance limitations for MVP
- Document for future optimization

### 7.6 Technology Stack

**To be decided by implementation, but suggested:**
- Vanilla JavaScript (no framework required for MVP)
- CSS Grid for layout (as demonstrated in `grid-demo.html`)
- Modern ES6+ syntax
- No build tools required (optional)

---

## 8. User Workflows

### 8.1 First-Time User

1. Open application
2. See empty state message
3. Click to Data Entry
4. Fill in teachers, student groups, rooms, subjects
5. Set number of periods
6. Click Save
7. Arrive at Main View with empty timetable
8. Begin filling in slots using dropdowns
9. Changes auto-save as they work

### 8.2 Returning User

1. Open application
2. Main View loads with existing timetable
3. Make edits via dropdowns
4. Changes auto-save
5. Navigate to derived views to check specific timetables
6. Return to Main View for more edits

### 8.3 Adding New Entities Mid-Session

1. From Main View, click "Data Entry"
2. Add new teacher/student group/room/subject to appropriate list
3. Click Save
4. Return to Main View
5. New entities appear in dropdowns
6. Assign to slots as needed

### 8.4 Correcting Mistakes

1. Navigate to Data Entry
2. Modify or delete entity names
3. Click Save
4. Slots referencing deleted entities now show blank
5. Re-assign affected slots in Main View

---

## 9. Validation & Conflict Rules

### 9.1 MVP Scope

**No validation or conflict detection in MVP**

The following are known issues but intentionally not addressed in MVP:
- Room double-booking (same room assigned to two slots at same time)
- StudentGroup double-booking (same group in two slots at same time)
- Incomplete slots (slots with some but not all optional fields assigned)

Note: Teacher double-booking is prevented by the data model (each teacher has exactly one slot per day/period).

### 9.2 Future Implementation

Document conflicts for post-MVP features, but do not implement:
- Red highlighting of conflicting cells
- Warning messages
- Conflict report panel
- Blocking saves when conflicts exist

---

## 10. Out of Scope for MVP

The following features are explicitly excluded from MVP:

### 10.1 Advanced Scheduling
- Double periods (2+ consecutive periods)
- Block scheduling
- Variable-length periods
- Week A / Week B rotations
- Non-teaching periods (lunch, assembly, break)
- Changing number of periods after initial setup
- Configurable days (non-Monday-Friday schedules)

### 10.2 Advanced Entity Features
- Team teaching (multiple teachers per slot)
- Multi-class teaching (multiple student groups per slot)
- Teacher availability/constraints
- Room capacity or equipment
- Subject requirements

### 10.3 Data Management
- Import/export functionality
- Multiple timetables
- Timetable templates
- Undo/redo
- Change history

### 10.4 Validation & Reporting
- Conflict detection
- Validation warnings
- Timetable statistics
- Utilization reports
- Gap analysis

### 10.5 UI Enhancements
- Drag and drop
- Keyboard shortcuts
- Bulk operations
- Search/filter
- Print formatting
- Mobile responsiveness

### 10.6 Collaboration
- Multi-user support
- Real-time sync
- User accounts
- Permissions

### 10.7 Integration
- Server-side storage
- Database backend
- API endpoints
- External system integration

---

## 11. Success Criteria

The MVP is considered successful if:

1. **Data Entry works:**
   - User can define teachers, student groups, rooms, subjects
   - User can set number of periods
   - Data persists in LocalStorage

2. **Main View functions:**
   - Grid displays correctly for entered teachers and periods
   - Dropdowns populate with entered entities
   - Selections save automatically
   - Selections persist after page reload

3. **Derived Views display:**
   - Teacher, StudentGroup, and Room timetables generate correctly
   - Filtered data displays accurately
   - Empty slots display appropriately
   - Navigation between views works

4. **Data persistence:**
   - All changes save to LocalStorage
   - Data survives browser close/reopen
   - No data loss during normal operation

5. **Usability:**
   - Interface is navigable without instructions
   - Basic timetable can be created in under 15 minutes
   - Desktop browsers render without major layout issues

---

## 12. Appendices

### Appendix A: Related Documents
- `DATASTRUCTURE.md` - Complete data model specification
- `grid-demo.html` - CSS Grid layout proof of concept

### Appendix B: Glossary

- **Slot:** A single teaching period on a specific day (atomic unit of timetable)
- **Entity:** Teacher, StudentGroup, Room, or Subject
- **StudentGroup:** A cohort of students that moves through the timetable together (formerly "Class")
- **Period:** A fixed time block within a school day
- **Main View:** Primary editing interface with all slots visible
- **Derived View:** Read-only filtered view of the timetable from one perspective

### Appendix C: Future Considerations

Items to consider for post-MVP releases:

**Short-term (Version 1.1):**
- Basic conflict detection (visual warnings only)
- Import/export JSON data
- Print-friendly styling

**Medium-term (Version 1.2-1.3):**
- Undo/redo functionality
- Keyboard navigation
- Incomplete slot highlighting

**Long-term (Version 2.0+):**
- Double/block periods
- Teacher constraints
- Server-side storage
- Multi-user support

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Feb 2026 | Initial | Initial draft specification |

---

**End of Specification**