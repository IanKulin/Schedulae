# Timetabling Data Model Specification (MVP)

## Overview

This document defines the core data structures for a simple timetabling web application.

The system models a timetable as a collection of independent **Slots**.
Each Slot represents a single teaching period on a specific day for a specific teacher.

All timetable views (by Room, Teacher, or StudentGroup) are derived from the same Slot data.

The MVP assumes:
- Fixed days: Monday through Friday (hardcoded)
- A configurable number of Periods per day (set once at initial setup)
- At most one Teacher, Room, StudentGroup, and Subject per Slot
- Slots are pre-created for all Teacher/Day/Period combinations
- StudentGroup, Room, and Subject fields may be unassigned during timetable construction

---

## Core Concepts

### Slot (Atomic Unit)

A **Slot** represents one scheduled teaching period on one day for a particular teacher.

It is the single source of truth for timetable data.

### Entities

The following entities are stored separately and referenced by ID:
- Teacher
- Room
- StudentGroup
- Subject

---

## Slot Data Structure

### Slot Object

```json
{
  "id": "slot_monday_1_1",
  "day": "Monday",
  "period": 1,
  "teacherId": "1",
  "studentGroupId": "1",
  "roomId": "1",
  "subjectId": "1"
}
```

### Field Definitions

| Field          | Type    | Required | Description |
|----------------|---------|----------|-------------|
| id             | string  | Yes      | Unique identifier derived from day, period, and teacherId |
| day            | string  | Yes      | Day of the week (Monday-Friday) |
| period         | number  | Yes      | Period number within the day |
| teacherId      | string  | Yes      | ID of the assigned Teacher |
| studentGroupId | string  | No       | ID of the assigned StudentGroup |
| roomId         | string  | No       | ID of the assigned Room |
| subjectId      | string  | No       | ID of the assigned Subject |

### Notes

- A Slot is uniquely identified by `(day, period, teacherId)`.
- The `id` field is derived from these three values: `slot_{day}_{period}_{teacherId}` (e.g., `slot_monday_1_1`).
- `teacherId` is always set (slots are pre-created for every teacher/day/period combination).
- `studentGroupId`, `roomId`, and `subjectId` may be null/unassigned during timetable construction.
- Slots with all optional fields unassigned are valid and represent free periods for that teacher.

---

## Entity Data Structures

### Teacher

```json
{
  "id": "1",
  "name": "Ms Smith"
}
```

Entity IDs are auto-generated incrementing integers (stored as strings). Each entity type maintains its own ID sequence starting at 1.

### Room

```json
{
  "id": "1",
  "name": "Room 12"
}
```

### StudentGroup

```json
{
  "id": "1",
  "name": "9A"
}
```

### Subject

```json
{
  "id": "1",
  "name": "Mathematics"
}
```

### Period

```json
{
  "id": 1,
  "name": "P1"
}
```

Periods are stored as objects (not plain numbers) to allow for custom display names. The `id` is an integer starting at 1; `name` defaults to `"P{id}"` but can be customised.

---

## Timetable Structure

The timetable is represented as a collection of Slots plus entity definitions.

Days are hardcoded as Monday through Friday. The number of periods is set once during initial setup and cannot be changed.

```json
{
  "periods": [
    { "id": 1, "name": "P1" },
    { "id": 2, "name": "P2" }
  ],

  "teachers": { },
  "rooms": { },
  "studentGroups": { },
  "subjects": { },

  "slots": [ ]
}
```

### Slot Pre-Creation

When the timetable is first saved, slots are pre-created for every combination of:
- Teacher (all defined teachers)
- Day (Monday through Friday)
- Period (1 through N, where N is the configured number of periods)

This means for 3 teachers and 6 periods: 3 × 5 × 6 = 90 slots are created.

---

## Derived Views (Not Stored)

Timetable grids are **derived views**, not stored structures.

Days are always displayed in order: Monday, Tuesday, Wednesday, Thursday, Friday.

### Room Timetable View

To generate a timetable for a Room:
1. Filter Slots by `roomId`
2. Display in a grid with days as columns and periods as rows

### Teacher Timetable View

To generate a timetable for a Teacher:
1. Filter Slots by `teacherId`
2. Display in a grid with days as columns and periods as rows

### StudentGroup Timetable View

To generate a timetable for a StudentGroup:
1. Filter Slots by `studentGroupId`
2. Display in a grid with days as columns and periods as rows

---

## Validation Rules (Logical Constraints)

The MVP is not enforcing or alerting to any conflicts.

---

## Open Questions / Future Extensions

The following are intentionally out of scope for the MVP but may affect future versions:

- Double or block periods
- Variable-length periods
- Team teaching (multiple teachers per Slot)
- Multiple StudentGroups in one Slot
- Week rotations (e.g. Week A / Week B)
- Non-teaching periods (lunch, assembly)
- Configurable days (non-Monday-Friday schedules)
- Changing the number of periods after initial setup

The current model is designed to evolve without breaking existing data.
