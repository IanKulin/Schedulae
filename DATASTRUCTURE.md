# Timetabling Data Model Specification (MVP)

## Overview

This document defines the core data structures for a simple timetabling web application.

The system models a timetable as a collection of independent **Slots**.  
Each Slot represents a single teaching period on a specific day.

All timetable views (by Room, Teacher, or Class) are derived from the same Slot data.

The MVP assumes:
- A fixed set of Days
- A fixed set of Periods per day
- At most one Teacher, Room, Class, and Subject per Slot
- Fields may be undefined during timetable construction

---

## Core Concepts

### Slot (Atomic Unit)

A **Slot** represents one scheduled teaching period on one day.

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
  "id": "slot_001",
  "day": "Monday",
  "period": 1,
  "teacherId": "teacher_12",
  "roomId": "room_12",
  "studentGroupId": "studentGroup_9A",
  "subjectId": "subject_math"
}
```

### Field Definitions

| Field        | Type    | Required | Description |
|-------------|---------|----------|-------------|
| id          | string  | Yes      | Unique identifier for the Slot |
| day         | string  | Yes      | Day of the week (from a fixed set) |
| period      | number  | Yes      | Period number within the day |
| teacherId  | string  | No       | ID of the assigned Teacher |
| roomId     | string  | No       | ID of the assigned Room |
| studentGroupId | string  | No       | ID of the assigned StudentGroup |
| subjectId  | string  | No       | ID of the assigned Subject |

### Notes

- Any of `teacherId`, `roomId`, `studentGroupId`, or `subjectId` may be null or omitted during timetable construction.
- A Slot is uniquely identified by `(day, period)` in the context of a specific timetable.
- The `id` field exists to support editing, persistence, and referencing.

---

## Entity Data Structures

### Teacher

```json
{
  "id": "teacher_12",
  "name": "Ms Smith"
}
```

### Room

```json
{
  "id": "room_12",
  "name": "Room 12"
}
```

### StudentGroup

```json
{
  "id": "studentGroup_9A",
  "name": "9A"
}
```

### Subject

```json
{
  "id": "subject_math",
  "name": "Mathematics"
}
```

---

## Timetable Structure

The timetable is represented as a collection of Slots plus entity definitions.

```json
{
  "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  "periods": [1, 2, 3, 4, 5, 6],

  "teachers": { },
  "rooms": { },
  "studentGroups": { },
  "subjects": { },

  "slots": [ ]
}
```

---

## Derived Views (Not Stored)

Timetable grids are **derived views**, not stored structures.

### Room Timetable View

To generate a timetable for a Room:
1. Filter Slots by `roomId`
2. Group by `day`
3. Sort by `period`

### Teacher Timetable View

To generate a timetable for a Teacher:
1. Filter Slots by `teacherId`
2. Group by `day`
3. Sort by `period`

### StudentGroup Timetable View

To generate a timetable for a StudentGroup:
1. Filter Slots by `studentGroupId`
2. Group by `day`
3. Sort by `period`

---

## Validation Rules (Logical Constraints)

These rules are enforced at the application level, not by the data structure itself.

Examples:
- A Teacher may not be assigned to more than one Slot with the same day and period
- A Room may not be assigned to more than one Slot with the same day and period
- A StudentGroup may not be assigned to more than one Slot with the same day and period

Slots that violate these rules are considered invalid.

---

## Open Questions / Future Extensions

The following are intentionally out of scope for the MVP but may affect future versions:

- Double or block periods
- Variable-length periods
- Team teaching (multiple teachers per Slot)
- Multiple classes in one Slot
- Week rotations (e.g. Week A / Week B)
- Non-teaching periods (lunch, assembly)

The current model is designed to evolve without breaking existing data.

---
