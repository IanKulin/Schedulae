# Schedulae

A simple web application for creating school timetables. Designed for small schools that need a straightforward way to manage teacher schedules, student groups, rooms, and subjects.

## Features

### Data Management
- Define teachers, student groups, rooms, and subjects
- Configure the number of periods per day (1-20)
- Data persists in browser LocalStorage (nothing is sent to a server so you data is secure)
- Export and import timetables as JSON files

### Main Editing View
- Grid-based interface with teachers as columns and day/period as rows
- Assign student groups, rooms, and subjects to each slot via dropdown menus
- Add/edit/delete teachers
- Changes save automatically
- Sticky headers for easy navigation of large timetables
- Timetabling conflicts highlighted

### Derived Views
- Teacher timetables: view each teacher's schedule
- Student group timetables: view each class's schedule
- Room timetables: view room usage

### Technical Details
- Runs entirely in the browser (no server-side processing required)
- Optimised for desktop browsers (Chrome, Firefox, Safari, Edge)

### File management

Data is stored in LocalStorage in the web browser. Clearing browser data will delete the timetable. Use the export feature to download a file that contains your timetable data. It's also possible to import these files - for example if you are changing to a new browser.

## Export/Import File Format

Timetables export as JSON files with the following structure:

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

## User manual
See [user manual here](MANUAL.md)

### Field Reference

**periods**: Array of period numbers (e.g., [1, 2, 3, 4, 5, 6])

**teachers, studentGroups, rooms, subjects**: Objects keyed by ID, each containing:
- `id`: String identifier
- `name`: Display name

**slots**: Array of slot objects, each containing:
- `id`: Format is `slot_{day}_{period}_{teacherId}` (e.g., `slot_monday_1_1`)
- `day`: "Monday", "Tuesday", "Wednesday", "Thursday", or "Friday"
- `period`: Integer period number
- `teacherId`: Required, references a teacher ID
- `studentGroupId`: Optional, references a student group ID (null if unassigned)
- `roomId`: Optional, references a room ID (null if unassigned)
- `subjectId`: Optional, references a subject ID (null if unassigned)

Exported files are named `schedulae-timetable-YYYY-MM-DD.json`.

## Installation

Copy the contents of the `public` directory to your web server:

```
public/
  index.html
  css/
  js/
```

No build step required. The application runs from static files.

## Developing

Clone the repo and:
```bash
npm install
npm start
```
This starts a server at http://localhost:3000.

The node/express server is just serving the static files - there's no back end, but the tests run with the node built-in test runner.

### Docker

To build and push the image to `ghcr.io/iankulin/schedulae`:
```bash
npm run docker:push
```
This runs `docker-push.sh`, which reads the version from `package.json` and builds/pushes four tags: the full semver (e.g. `1.0.0`), major.minor (`1.0`), major (`1`), and `latest`.

To run the published image locally:
```bash
npm run docker:run
```
This starts the app at http://localhost:3000.

### Browser Storage

Data is stored in LocalStorage under the key `timetableData`. Clearing browser data will delete the timetable. Use the export feature to back up your work.

### Limitations

- Number of periods cannot be changed after initial setup
- No mobile browser support
- Single timetable per browser

### Running Tests

```bash
npm test
```

Tests use Node's built-in test runner.

### AI Disclosure
AI tools were used in the development of this app.

### License
[GPL3](https://github.com/IanKulin/Schedulae/blob/main/LICENSE)
