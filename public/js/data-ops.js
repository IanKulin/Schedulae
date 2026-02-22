/**
 * Schedulae - Higher-level Data Operations
 * Depends on: data.js (DAYS, ENTITY_FIELD_MAP, generateSlotId, createSlotsForTeacher)
 */

// In Node: import data.js dependencies; in browser they are already globals
if (typeof module !== 'undefined' && module.exports) {
    ({ DAYS, ENTITY_FIELD_MAP, generateSlotId, createSlotsForTeacher } = require('./data.js'));
}

/**
 * Count the number of slots that would be affected by removing periods
 * @param {Object} data - TimetableData object
 * @param {number} newPeriodCount - The new (lower) period count
 * @returns {number} Count of slots that would be deleted
 */
function countSlotsForPeriods(data, newPeriodCount) {
    return data.slots.filter(slot => slot.period > newPeriodCount).length;
}

/**
 * Count the number of slots referencing a specific entity
 * @param {string} entityType - Type of entity: 'studentGroups', 'rooms', 'subjects'
 * @param {string} entityId - Entity ID to count references for
 * @param {Object[]} slots - Array of slot objects
 * @returns {number} Count of slots referencing this entity
 */
function countSlotsReferencingEntity(entityType, entityId, slots) {
    const field = ENTITY_FIELD_MAP[entityType];
    if (!field) {
        return 0;
    }

    return slots.filter(slot => slot[field] === entityId).length;
}

/**
 * Update an entity's name while preserving its ID
 * @param {Object} entities - Entities object (e.g., data.studentGroups)
 * @param {string} entityId - ID of entity to update
 * @param {string} newName - New name for the entity
 * @returns {Object} Updated entities object
 */
function updateEntityName(entities, entityId, newName) {
    if (!entities[entityId]) {
        return entities;
    }

    return {
        ...entities,
        [entityId]: { id: entityId, name: newName }
    };
}

/**
 * Add periods to a timetable, creating new slots for all existing teachers
 * @param {Object} data - TimetableData object
 * @param {number} newPeriodCount - The new (higher) period count
 * @returns {Object} The updated data object
 */
function addPeriodsToTimetable(data, newPeriodCount) {
    const currentMax = data.periods.length;

    // Add new period objects to the array
    for (let p = currentMax + 1; p <= newPeriodCount; p++) {
        data.periods.push({ id: p, name: 'P' + p });
    }

    // Create slots for new periods
    const teacherIds = Object.keys(data.teachers);
    for (const teacherId of teacherIds) {
        for (let p = currentMax + 1; p <= newPeriodCount; p++) {
            for (const day of DAYS) {
                data.slots.push({
                    id: generateSlotId(day, p, teacherId),
                    day: day,
                    period: p,
                    teacherId: teacherId,
                    studentGroupId: null,
                    roomId: null,
                    subjectId: null
                });
            }
        }
    }

    return data;
}

/**
 * Remove periods from a timetable, deleting slots for the removed periods
 * @param {Object} data - TimetableData object
 * @param {number} newPeriodCount - The new (lower) period count
 * @returns {Object} The updated data object
 */
function removePeriodsFromTimetable(data, newPeriodCount) {
    // Remove slots for deleted periods
    data.slots = data.slots.filter(slot => slot.period <= newPeriodCount);

    // Update periods array
    data.periods = data.periods.slice(0, newPeriodCount);

    return data;
}

/**
 * Validate a teacher name for rename/add operations
 * @param {string} name - Name to validate
 * @returns {string|null} Error message or null if valid
 */
function validateTeacherName(name) {
    const trimmed = (name || '').trim();
    if (trimmed.length === 0) {
        return 'Name cannot be blank';
    }
    return null;
}

/**
 * Rename a teacher in-place on the data object
 * @param {Object} data - TimetableData object
 * @param {string} teacherId - ID of teacher to rename
 * @param {string} newName - New name (will be trimmed)
 * @returns {Object} { success: boolean, error?: string }
 */
function renameTeacher(data, teacherId, newName) {
    const trimmed = newName.trim();
    const error = validateTeacherName(trimmed);
    if (error) {
        return { success: false, error };
    }
    data.teachers[teacherId].name = trimmed;
    return { success: true };
}

/**
 * Delete a teacher and all their slots from the data object
 * @param {Object} data - TimetableData object
 * @param {string} teacherId - ID of teacher to delete
 */
function deleteTeacher(data, teacherId) {
    delete data.teachers[teacherId];
    data.slots = data.slots.filter(slot => slot.teacherId !== teacherId);
}

/**
 * Add a new teacher positioned immediately after the given teacher,
 * reassigning all teacher IDs to maintain sort order.
 * @param {Object} data - TimetableData object
 * @param {string} afterTeacherId - ID of teacher to insert after
 * @param {string} newName - Name for the new teacher
 * @returns {Object} { success: boolean, newTeacherId: string }
 */
function addTeacherAfter(data, afterTeacherId, newName) {
    // Get sorted teacher list and find insertion point
    const sorted = Object.entries(data.teachers)
        .sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10));
    const afterIndex = sorted.findIndex(([id]) => id === afterTeacherId);
    if (afterIndex === -1) {
        return { success: false, error: 'Teacher not found' };
    }

    // Splice new teacher into position
    const placeholder = { name: newName.trim() };
    sorted.splice(afterIndex + 1, 0, ['__new__', placeholder]);

    // Build old→new ID mapping and rebuild teachers
    const idMap = {}; // oldId → newId
    const newTeachers = {};
    let newTeacherId = null;

    for (let i = 0; i < sorted.length; i++) {
        const newId = String(i + 1);
        const [oldId, teacher] = sorted[i];

        if (oldId === '__new__') {
            newTeacherId = newId;
        } else {
            idMap[oldId] = newId;
        }

        newTeachers[newId] = { id: newId, name: teacher.name };
    }

    data.teachers = newTeachers;

    // Update existing slots: remap teacherId and regenerate slot IDs
    for (const slot of data.slots) {
        if (idMap[slot.teacherId]) {
            slot.teacherId = idMap[slot.teacherId];
            slot.id = generateSlotId(slot.day, slot.period, slot.teacherId);
        }
    }

    // Create slots for the new teacher
    const newSlots = createSlotsForTeacher(newTeacherId, data.periods.map(p => p.id));
    data.slots.push(...newSlots);

    return { success: true, newTeacherId };
}

/**
 * Validate a period name for rename operations
 * @param {string} name - Name to validate
 * @returns {string|null} Error message or null if valid
 */
function validatePeriodName(name) {
    const trimmed = (name || '').trim();
    if (trimmed.length === 0) return 'Name cannot be blank';
    return null;
}

/**
 * Rename a period in-place on the data object
 * @param {Object} data - TimetableData object
 * @param {number} periodId - Integer ID of the period to rename
 * @param {string} newName - New name (will be trimmed)
 * @returns {Object} { success: boolean, error?: string }
 */
function renamePeriod(data, periodId, newName) {
    const trimmed = newName.trim();
    const error = validatePeriodName(trimmed);
    if (error) return { success: false, error };
    const period = data.periods.find(p => p.id === periodId);
    if (!period) return { success: false, error: 'Period not found' };
    period.name = trimmed;
    return { success: true };
}

// Export for Node.js testing (ignored in browser)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        countSlotsForPeriods,
        countSlotsReferencingEntity,
        updateEntityName,
        addPeriodsToTimetable,
        removePeriodsFromTimetable,
        validateTeacherName,
        renameTeacher,
        deleteTeacher,
        addTeacherAfter,
        validatePeriodName,
        renamePeriod
    };
}
