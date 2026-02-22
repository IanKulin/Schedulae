# Quality Checks - Schedulae Manual QA Checklist

Run through these checks after each batch of changes. Not every section needs testing every time — pick the sections relevant to what changed, plus any critical flows.

---

## 1. First-Time Setup

- [ ] No data in storage → Setup page shown on load
- [ ] Enter valid period count (1–20) → Creates timetable
- [ ] Enter 0 or negative → Error: "Must be a positive whole number"
- [ ] Enter text/non-numeric → Error: "Must be a positive whole number"
- [ ] Leave blank → Validation error
- [ ] Enter decimal (e.g. 5.5) → Treated as 5
- [ ] Period count persists after reload

---

## 2. Setup Page — Teachers (Textarea)

- [ ] Add single teacher → Appears in builder grid
- [ ] Add multiple teachers at once (paste several lines) → All added
- [ ] Blank line in textarea → Error: "Line X is blank"
- [ ] Whitespace-only line → Error: treated as blank
- [ ] Duplicate name → Error: "Duplicate name: X"
- [ ] Special characters (O'Brien, Dr. Smith, Room 2) → Accepted
- [ ] HTML/script tags as name → Displayed as plain text, not executed
- [ ] Leading/trailing spaces → Trimmed on save
- [ ] Remove teacher from textarea → Column removed from grid
- [ ] Save with existing teachers removed → Confirmation shows affected slot count
- [ ] Cancel remove → Teacher stays

---

## 3. Setup Page — Student Groups, Rooms, Subjects (Inline Editor)

- [ ] Click "+ Add" → Input appears
- [ ] Type name, press Enter → Saved
- [ ] Type name, click Save → Saved
- [ ] Click Cancel → No change
- [ ] Press Escape → No change
- [ ] Leave blank and save → Error: "Name cannot be blank"
- [ ] Duplicate name → Error: "Duplicate name: X"
- [ ] Control/non-printable characters → Error
- [ ] Click Edit → Input shows current name
- [ ] Change name and save → Updated everywhere (grid dropdowns, timetable views)
- [ ] Cancel edit → Reverts to original
- [ ] Escape during edit → Reverts to original
- [ ] Click Delete on unused entity → Confirmation: "Delete 'X'?"
- [ ] Click Delete on used entity → Confirmation shows slot count
- [ ] Cancel deletion → Entity remains
- [ ] Confirm deletion → Entity removed; affected slots set to null (not hard-deleted)
- [ ] Empty section → Shows "No items added yet"

---

## 4. Setup Page — Changing Period Count

- [ ] Increase periods (e.g. 6 → 8) → New empty slots created, existing data preserved
- [ ] Decrease periods (e.g. 6 → 4) → Confirmation dialog shows period names being removed and slot count
- [ ] Cancel decrease → Count unchanged
- [ ] Confirm decrease → Periods 5–6 and their slots deleted permanently
- [ ] Cannot set below 1 → Validation prevents it
- [ ] Cannot set above 20 → Validation prevents it

---

## 5. Timetable Builder — Grid

- [ ] Grid shows days × periods as rows, teachers as columns
- [ ] Row headers: day abbreviation + period name
- [ ] No teachers → Empty state shown with link to Setup
- [ ] Empty state link → Goes to Setup page
- [ ] Headers sticky when scrolling horizontally and vertically
- [ ] Each cell has three dropdowns: Student Group, Room, Subject
- [ ] First option in each dropdown is blank (—)
- [ ] Select a value → Saved automatically (debounced ~500ms)
- [ ] Select blank → Clears that field (sets to null)
- [ ] Reload page → All selections persisted
- [ ] Dropdowns reflect entities in entry order

---

## 6. Timetable Builder — Teacher Management

- [ ] Click teacher name in header → Enters edit mode (shows trash icon, input, + button)
- [ ] Change name and press Enter → Saved, exits edit
- [ ] Press Escape → Reverts, exits edit
- [ ] Click trash → Confirmation dialog
- [ ] Confirm delete → Column and all its slots removed
- [ ] Cancel delete → Stays in edit mode
- [ ] Save empty name → Error: "Name cannot be blank"
- [ ] Click "+" button (in edit mode) → Adds new teacher after current
- [ ] New teacher → Named "New Teacher", column with empty slots created
- [ ] Click teacher dropdown arrow → Defaults panel expands
- [ ] Set defaults (any combination of Student Group, Room, Subject) and click Apply → Fills only blank cells in that column for those fields
- [ ] Apply does not overwrite already-filled cells
- [ ] Click arrow again → Panel collapses

---

## 7. Timetable Builder — Period Management

- [ ] Click period label (e.g. P1) → Enters edit mode
- [ ] Change name and press Enter → Saved; new name appears in grid and timetable views
- [ ] Press Escape → Reverts
- [ ] Save empty name → Error: "Name cannot be blank"
- [ ] Custom names (e.g. "Lunch", "1st Period") → Displayed everywhere

---

## 8. Conflict Detection

- [ ] Assign same Student Group to two teachers at the same day/period → Both cells highlighted orange
- [ ] Assign same Room to two teachers at the same day/period → Both cells highlighted orange
- [ ] Hover over a conflicted cell → Tooltip appears near cursor
- [ ] Tooltip text: "Class: X is also scheduled with [Teacher]" or "Room: Y is also scheduled with [Teacher]"
- [ ] Tooltip stays on screen (doesn't go off-edge)
- [ ] Mouse leaves cell → Tooltip disappears
- [ ] Resolve conflict (change one dropdown) → Highlighting removed immediately
- [ ] Three teachers with same student group at same time → All three highlighted
- [ ] Both student group and room conflict in same cell → Tooltip shows both
- [ ] Blank fields → Not considered a conflict
- [ ] Same student group at different times for same teacher → No conflict
- [ ] Different teachers, different times → No conflict

---

## 9. Timetables View

- [ ] Three sections: Teachers, Student Groups, Rooms — all collapsed by default
- [ ] Click section header → Expands to show list
- [ ] Click again → Collapses
- [ ] Empty section → Shows "No entries found. Go to Setup to add some."
- [ ] "Go to Setup" link → Navigates to Setup
- [ ] Click entity name → Shows individual timetable for that entity
- [ ] Teacher timetable: shows Student Group, Room, Subject per slot
- [ ] Student Group timetable: shows Teacher, Room, Subject per slot
- [ ] Room timetable: shows Teacher, Student Group, Subject per slot
- [ ] Empty/unassigned slots → Blank or dashes
- [ ] Custom period names shown correctly
- [ ] "← Back to Timetables" link → Returns to Timetables page
- [ ] Print button → Opens browser print dialog

---

## 10. Export

- [ ] Click "Download timetable" → File downloaded
- [ ] Filename: `schedulae-timetable-YYYY-MM-DD.json`
- [ ] File is valid JSON
- [ ] File contains all teachers, student groups, rooms, subjects, periods, slots
- [ ] Export empty timetable → Valid file, empty collections
- [ ] Export filled timetable → All assignments present

---

## 11. Import

- [ ] Click "Import timetable" → File picker opens
- [ ] Cancel picker → No changes
- [ ] Select valid JSON export file → Confirmation dialog shown (if data exists)
- [ ] Cancel confirmation → Data unchanged
- [ ] Confirm import → All data replaced; grid and views update
- [ ] Import to empty timetable → No confirmation needed
- [ ] Success message shown → Auto-dismisses after ~3 seconds
- [ ] Invalid JSON file → Error message shown
- [ ] Missing required fields → Error message shown
- [ ] After import: reload page → Imported data persists

---

## 12. Input Sanitisation & Security

- [ ] Name with `<script>alert(1)</script>` → Displayed as plain text, no script executes
- [ ] Name with `<img src=x onerror=alert(1)>` → Displayed as plain text, escaped in DOM
- [ ] Name with Unicode (é, ñ, 中文) → Accepted and displayed correctly
- [ ] Name with control characters → Rejected with error

---

## 13. Data Integrity

- [ ] Delete Student Group used in slots → Slots remain, studentGroupId set to null
- [ ] Delete Room used in slots → Slots remain, roomId set to null
- [ ] Delete Subject used in slots → Slots remain, subjectId set to null
- [ ] Delete Teacher → All teacher's slots deleted (hard delete)
- [ ] Add teacher → Correct number of slots created (5 days × period count)
- [ ] No duplicate slot IDs
- [ ] Navigate between Setup, Builder, Timetables → Data consistent across all pages

---

## 14. Navigation

- [ ] Nav bar: Timetable Builder, Setup, Timetables all work
- [ ] Active page highlighted in nav
- [ ] Edit mode cancelled when leaving page (no stale inputs)
- [ ] Individual timetable → back link works

---

## 15. Critical User Journeys

Run these end-to-end after significant changes:

**Full workflow:**
1. Clear storage / open fresh
2. Create timetable (6 periods)
3. Add 3 teachers
4. Add 3 student groups, 2 rooms, 2 subjects
5. Fill some cells in the grid
6. Create a conflict (same student group, two teachers, same slot)
7. Verify conflict highlighted; resolve it
8. View each teacher timetable, one student group, one room
9. Export; verify file
10. Clear storage; import exported file; verify data restored

**Period change:**
1. Start with 6 periods, fill some slots
2. Increase to 8 — existing data preserved, two new empty rows
3. Decrease back to 6 — confirmation shown, confirmed, P7/P8 slots removed
4. Decrease to 4 — same confirmation flow

**Teacher rename and delete:**
1. Edit teacher name in builder → name updates in grid and timetable views
2. Delete teacher → column gone, slots gone, timetable view updated

---

## 16. Edge Cases

- [ ] 1 period (minimum) → Grid renders, timetables correct
- [ ] 20 periods (maximum) → Grid renders, no layout issues
- [ ] 1 teacher → Single column grid
- [ ] Many teachers (10+) → Horizontal scroll works
- [ ] 0 entities of a type → Dropdown shows only blank option
- [ ] All slots in a teacher column filled → Apply defaults does nothing
- [ ] Rapid dropdown changes → Final value correct after debounce
- [ ] Two browser tabs open → Changes in one not automatically reflected in other (expected)
