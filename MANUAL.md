# Schedulae User Manual

## What is Schedulae?

Schedulae is a simple timetabling app for small schools. It helps you build a weekly schedule that shows what each teacher is doing in every period of every day — which student group they're teaching, in which room, and which subject.

The app runs entirely in your browser. Your data is stored locally on your computer (in browser storage), so nothing is sent to any server. You can export your timetable to a file for safekeeping or to move it to another browser.

---

## Getting Started

### Step 1: Create a Timetable

When you open Schedulae for the first time, you'll see the **Setup** page with a prompt to create a timetable.

- Enter the **number of periods per day** your school uses (between 1 and 12). For example, if your school has 6 lessons per day, enter 6.
- Click **Create Timetable**.

> **Note:** You can change the number of periods later from the Setup page, but reducing periods will permanently delete any data already entered for the removed periods.

---

### Step 2: Add Teachers

After creating the timetable, the Setup page shows the full editing form.

In the **Teachers** section:
- Type each teacher's name in the text area, one name per line.
- Click **Save Teachers**.

Teachers form the columns of the timetable grid, so add all teachers before you start scheduling.

> You can add, remove, or rename teachers later — from either the Setup page or directly in the Timetable Builder.

---

### Step 3: Add Student Groups, Rooms, and Subjects

On the same Setup page, you'll find separate sections for:

- **Student Groups** — the classes or year groups in your school (e.g. *9A*, *Year 10*, *Sixth Form*)
- **Rooms** — the teaching spaces (e.g. *Room 12*, *Science Lab*, *Gym*)
- **Subjects** — what is being taught (e.g. *Mathematics*, *English*, *PE*)

For each section:
- Type each name in the text area, one name per line.
- Click the **Save** button for that section.

If you remove a name that is already used in the timetable, you'll be warned how many slots will be affected and asked to confirm before the change is saved.

---

### Step 4: Fill In the Timetable

Click **Timetable Builder** in the navigation bar at the top.

The builder shows a grid with:
- **Rows** for each combination of day and period (Monday Period 1, Monday Period 2, … Friday Period 6)
- **Columns** for each teacher

Each cell in the grid represents one teaching slot. Use the three dropdown menus in each cell to assign:
1. **Student Group** — which class is being taught
2. **Room** — where the lesson takes place
3. **Subject** — what is being taught

Leaving any dropdown blank means that field is unassigned for that slot (useful for free periods or when you haven't decided yet).

Changes are saved automatically a moment after you make them — there's no Save button needed in the builder.

#### Filling a Teacher's Column Quickly (Defaults)

If a teacher spends most of their time with the same class, room, or subject, you can fill their empty slots in bulk using **Defaults**:

1. Click the small arrow (▼) next to a teacher's name.
2. A panel drops down with three dropdowns — Student Group, Room, and Subject.
3. Select the values you want to apply as defaults.
4. Click **Apply**.

This fills any blank cells in that teacher's column with the chosen values, without overwriting cells you've already filled in.

#### Editing or Adding Teachers in the Builder

You can manage teachers without leaving the builder:
- **Click a teacher's name** to enter edit mode. You can rename them, delete them, or add a new teacher column next to them.
- Press **Enter** to save a rename, or **Escape** to cancel.

#### Editing Period names in the Builder

You can manage Periods without leaving the builder:
- **Click a period's name** to enter edit mode. You can rename them.
- Press **Enter** to save a rename, or **Escape** to cancel.

---

### Step 5: Check for Conflicts

Schedulae automatically detects two types of conflict:
- A **student group** is assigned to two different teachers at the same time.
- A **room** is assigned to two different teachers at the same time.

Conflicting cells are highlighted in orange, and the specific dropdown that has the conflict turns orange. Hover over a highlighted cell to see a tooltip explaining which entity is double-booked and with whom.

---

### Step 6: View Individual Timetables

Once you've filled in the builder, click **Timetables** in the navigation bar.

This page shows three collapsible sections — **Teachers**, **Student Groups**, and **Rooms**. Expand a section and click any name to see that person's or room's full weekly timetable as a simple grid (days across the top, periods down the side).

---

## Saving and Backing Up Your Work

Your timetable is saved automatically in the browser. However, browser storage can be cleared accidentally (for example, if you clear your browser history or cache). It's good practice to export your timetable regularly.

### Downloading a Backup

1. Go to **Setup**.
2. Scroll to the **Import / Maintenance** section at the bottom.
3. Click **Download timetable**.

This saves a `.json` file to your downloads folder named something like `schedulae-timetable-2026-02-21.json`. Keep this file somewhere safe.

### Importing a Timetable

To restore a backup, or to move your timetable to a different browser:

1. Go to **Setup**.
2. Scroll to **Import / Maintenance**.
3. Click **Import timetable** and select your `.json` file.

> **Warning:** Importing a file will replace your current timetable completely.

---

## Tips

- The timetable covers **Monday to Friday** only.
- Each slot can only have **one teacher, one student group, one room, and one subject**. Block periods and team teaching are not currently supported.
- You can have a maximum of **20 periods per day**.
- The app is designed for **desktop browsers**. Mobile browsers are not officially supported.
