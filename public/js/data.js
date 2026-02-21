/**
 * Schedulae - Data Model and LocalStorage Operations
 */

// Constants
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const STORAGE_KEY = "timetableData";

/**
 * Creates an empty TimetableData structure
 * @param {number} periodCount - Number of periods per day
 * @returns {Object} Empty TimetableData object
 */
function createEmptyTimetableData(periodCount = 6) {
    const periods = [];
    for (let i = 1; i <= periodCount; i++) {
        periods.push({ id: i, name: 'P' + i });
    }

    return {
        periods: periods,
        teachers: {},
        rooms: {},
        studentGroups: {},
        subjects: {},
        slots: []
    };
}

/**
 * Load timetable data from LocalStorage
 * @returns {Object|null} Parsed TimetableData or null if not found
 */
function loadData() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
        return null;
    } catch (error) {
        console.error("Error loading data from LocalStorage:", error);
        return null;
    }
}

/**
 * Save timetable data to LocalStorage
 * @param {Object} data - TimetableData object to save
 * @returns {boolean} True if save successful, false otherwise
 */
function saveData(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error("Error saving data to LocalStorage:", error);
        return false;
    }
}

/**
 * Check if timetable data exists in LocalStorage
 * @returns {boolean}
 */
function hasExistingData() {
    return localStorage.getItem(STORAGE_KEY) !== null;
}

/**
 * Generate a new entity ID by scanning existing IDs and returning next integer
 * @param {string} entityType - Type of entity: "teachers", "rooms", "studentGroups", "subjects"
 * @param {Object} data - Current TimetableData
 * @returns {string} Next available ID as string
 */
function generateEntityId(entityType, data) {
    const entities = data[entityType] || {};
    const existingIds = Object.keys(entities).map(id => parseInt(id, 10));

    if (existingIds.length === 0) {
        return "1";
    }

    const maxId = Math.max(...existingIds);
    return String(maxId + 1);
}

/**
 * Generate a slot ID from day, period, and teacher ID
 * @param {string} day - Day of the week
 * @param {number} period - Period number
 * @param {string} teacherId - Teacher ID
 * @returns {string} Slot ID in format: slot_{day}_{period}_{teacherId}
 */
function generateSlotId(day, period, teacherId) {
    return `slot_${day.toLowerCase()}_${period}_${teacherId}`;
}

/**
 * Create slots for a single teacher across all days and periods
 * @param {string} teacherId - Teacher ID
 * @param {number[]} periods - Array of period numbers
 * @returns {Object[]} Array of Slot objects
 */
function createSlotsForTeacher(teacherId, periods) {
    const slots = [];

    for (const day of DAYS) {
        for (const period of periods) {
            slots.push({
                id: generateSlotId(day, period, teacherId),
                day: day,
                period: period,
                teacherId: teacherId,
                studentGroupId: null,
                roomId: null,
                subjectId: null
            });
        }
    }

    return slots;
}

/**
 * Create slots for all teachers across all days and periods
 * @param {Object} teachers - Teachers object from TimetableData
 * @param {number[]} periods - Array of period numbers
 * @returns {Object[]} Array of all Slot objects
 */
function createAllSlots(teachers, periods) {
    const allSlots = [];

    for (const teacherId of Object.keys(teachers)) {
        const teacherSlots = createSlotsForTeacher(teacherId, periods);
        allSlots.push(...teacherSlots);
    }

    return allSlots;
}

/**
 * Get a slot by its ID
 * @param {Object[]} slots - Array of slots
 * @param {string} slotId - Slot ID to find
 * @returns {Object|undefined} The slot or undefined if not found
 */
function getSlotById(slots, slotId) {
    return slots.find(slot => slot.id === slotId);
}

/**
 * Get all slots for a specific teacher
 * @param {Object[]} slots - Array of all slots
 * @param {string} teacherId - Teacher ID
 * @returns {Object[]} Filtered array of slots
 */
function getSlotsForTeacher(slots, teacherId) {
    return slots.filter(slot => slot.teacherId === teacherId);
}

/**
 * Get all slots for a specific day and period
 * @param {Object[]} slots - Array of all slots
 * @param {string} day - Day of the week
 * @param {number} period - Period number
 * @returns {Object[]} Filtered array of slots
 */
function getSlotsForDayPeriod(slots, day, period) {
    return slots.filter(slot => slot.day === day && slot.period === period);
}

/**
 * Get slots filtered by entity type and ID
 * @param {string} entityType - Type: 'teachers', 'studentGroups', 'rooms'
 * @param {string} entityId - ID of the entity to filter by
 * @param {Object[]} slots - Array of all slots
 * @returns {Object[]} Filtered array of slots
 */
function getSlotsForEntity(entityType, entityId, slots) {
    const fieldMap = {
        'teachers': 'teacherId',
        'studentGroups': 'studentGroupId',
        'rooms': 'roomId'
    };

    const field = fieldMap[entityType];
    if (!field) {
        return [];
    }

    return slots.filter(slot => slot[field] === entityId);
}

/**
 * Parse textarea text into an array of names
 * Splits by newlines, trims whitespace, filters empty lines
 * @param {string} text - Raw textarea value
 * @returns {string[]} Array of trimmed, non-empty names
 */
function parseTextareaToNames(text) {
    if (!text || typeof text !== 'string') {
        return [];
    }

    return text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
}

/**
 * Validate periods value
 * @param {string|number} value - Periods input value
 * @returns {string|null} Error message or null if valid
 */
function validatePeriods(value) {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1) {
        return 'Must be a positive whole number';
    }
    if (num > 20) {
        return 'Maximum 20 periods allowed';
    }
    return null;
}

/**
 * Check if a string contains control characters (excluding normal whitespace)
 * @param {string} str - String to check
 * @returns {boolean} True if contains invalid characters
 */
function hasInvalidCharacters(str) {
    // Allow printable characters and normal whitespace, reject control chars
    // eslint-disable-next-line no-control-regex
    return /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(str);
}

/**
 * Validate an array of entity names
 * @param {string[]} names - Array of names to validate
 * @returns {string[]} Array of error messages (empty if valid)
 */
function validateEntityNames(names) {
    const errors = [];

    // Check for blank names after trim
    for (let i = 0; i < names.length; i++) {
        if (names[i].length === 0) {
            errors.push(`Line ${i + 1} is blank`);
        }
    }

    // Check for duplicates (case-sensitive)
    const seen = new Set();
    for (let i = 0; i < names.length; i++) {
        const name = names[i];
        if (seen.has(name)) {
            errors.push(`Duplicate name: "${name}"`);
        } else {
            seen.add(name);
        }
    }

    // Check for invalid characters
    for (let i = 0; i < names.length; i++) {
        if (hasInvalidCharacters(names[i])) {
            errors.push(`Line ${i + 1} contains invalid characters`);
        }
    }

    return errors;
}

/**
 * Validate all form inputs
 * @param {Object} formData - Object with periods and entity name arrays
 * @param {string|number} formData.periods - Number of periods
 * @param {string[]} formData.teachers - Array of teacher names
 * @param {string[]} formData.studentGroups - Array of student group names
 * @param {string[]} formData.rooms - Array of room names
 * @param {string[]} formData.subjects - Array of subject names
 * @returns {Object} Object with field-specific errors: { periods: string|null, teachers: string|null, ... }
 */
function validateAllInputs(formData) {
    const errors = {
        periods: null,
        teachers: null,
        studentGroups: null,
        rooms: null,
        subjects: null
    };

    // Validate periods
    errors.periods = validatePeriods(formData.periods);

    // Validate each entity type
    const teacherErrors = validateEntityNames(formData.teachers);
    if (teacherErrors.length > 0) {
        errors.teachers = teacherErrors.join('; ');
    }

    const studentGroupErrors = validateEntityNames(formData.studentGroups);
    if (studentGroupErrors.length > 0) {
        errors.studentGroups = studentGroupErrors.join('; ');
    }

    const roomErrors = validateEntityNames(formData.rooms);
    if (roomErrors.length > 0) {
        errors.rooms = roomErrors.join('; ');
    }

    const subjectErrors = validateEntityNames(formData.subjects);
    if (subjectErrors.length > 0) {
        errors.subjects = subjectErrors.join('; ');
    }

    return errors;
}

/**
 * Check if validation errors object has any errors
 * @param {Object} errors - Validation errors object
 * @returns {boolean} True if there are any errors
 */
function hasValidationErrors(errors) {
    return Object.values(errors).some(error => error !== null);
}

/**
 * Find an entity by name in an entities object
 * @param {Object} entities - Entities object (e.g., data.teachers)
 * @param {string} name - Name to find
 * @returns {string|null} Entity ID if found, null otherwise
 */
function findEntityIdByName(entities, name) {
    for (const [id, entity] of Object.entries(entities)) {
        if (entity.name === name) {
            return id;
        }
    }
    return null;
}

/**
 * Sync entities from form names to data structure
 * - Matches existing entities by name
 * - Creates new entities for new names
 * - Returns list of deleted entity IDs
 * @param {Object} currentEntities - Current entities object from data
 * @param {string[]} newNames - Array of names from form
 * @param {string} entityType - Type of entity for ID generation
 * @param {Object} data - Full timetable data (for ID generation)
 * @returns {Object} { entities: Object, deletedIds: string[] }
 */
function syncEntities(currentEntities, newNames, entityType, data) {
    const newEntities = {};
    const deletedIds = [];
    const usedIds = new Set();

    // Track which existing entities are still present
    for (const name of newNames) {
        const existingId = findEntityIdByName(currentEntities, name);
        if (existingId) {
            // Keep existing entity
            newEntities[existingId] = { id: existingId, name: name };
            usedIds.add(existingId);
        } else {
            // Create new entity
            const newId = generateEntityId(entityType, { [entityType]: newEntities });
            newEntities[newId] = { id: newId, name: name };
            usedIds.add(newId);
        }
    }

    // Find deleted entities
    for (const id of Object.keys(currentEntities)) {
        if (!usedIds.has(id)) {
            deletedIds.push(id);
        }
    }

    return { entities: newEntities, deletedIds };
}

/**
 * Update slots to orphan references to deleted entities
 * Sets the relevant field to null for any slot referencing a deleted entity
 * @param {Object[]} slots - Array of slot objects
 * @param {string} field - Field name to update (e.g., 'studentGroupId')
 * @param {string[]} deletedIds - Array of deleted entity IDs
 * @returns {Object[]} Updated slots array
 */
function orphanSlotReferences(slots, field, deletedIds) {
    if (deletedIds.length === 0) {
        return slots;
    }

    const deletedSet = new Set(deletedIds);

    return slots.map(slot => {
        if (slot[field] && deletedSet.has(slot[field])) {
            return { ...slot, [field]: null };
        }
        return slot;
    });
}

/**
 * Validate timetable data structure for file import
 * @param {Object} data - Data object to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateTimetableData(data) {
    if (!data || typeof data !== 'object') {
        return false;
    }

    // Check required top-level keys
    const requiredKeys = ['periods', 'teachers', 'rooms', 'studentGroups', 'subjects', 'slots'];
    for (const key of requiredKeys) {
        if (!(key in data)) {
            return false;
        }
    }

    // Validate periods array
    if (!Array.isArray(data.periods) || data.periods.length === 0) {
        return false;
    }
    if (!data.periods.every(p => p && typeof p === 'object' && Number.isInteger(p.id) && p.id > 0 && typeof p.name === 'string')) {
        return false;
    }

    // Validate entity objects have id and name
    for (const entityType of ['teachers', 'rooms', 'studentGroups', 'subjects']) {
        const entities = data[entityType];
        if (typeof entities !== 'object' || entities === null) {
            return false;
        }
        for (const [id, entity] of Object.entries(entities)) {
            if (!entity || typeof entity.id !== 'string' || typeof entity.name !== 'string') {
                return false;
            }
        }
    }

    // Validate slots array
    if (!Array.isArray(data.slots)) {
        return false;
    }
    for (const slot of data.slots) {
        if (!slot || !slot.id || !slot.day || !slot.period || !slot.teacherId) {
            return false;
        }
    }

    return true;
}

/**
 * Export timetable data to a JSON file download
 * @returns {boolean} True if export initiated, false if no data
 */
function exportToFile() {
    const data = loadData();
    if (!data) {
        return false;
    }

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const filename = `schedulae-timetable-${getDateString()}.json`;

    // Create download link and trigger
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    return true;
}

/**
 * Import timetable data from a JSON string
 * @param {string} jsonString - JSON string to parse and import
 * @returns {Object} { success: boolean, error?: string }
 */
function importFromFile(jsonString) {
    let data;

    // Try to parse JSON
    try {
        data = JSON.parse(jsonString);
    } catch (err) {
        return { success: false, error: 'Invalid file: Not valid JSON' };
    }

    // Validate structure
    if (!validateTimetableData(data)) {
        return { success: false, error: 'Invalid file: Missing required data structure' };
    }

    // Save to LocalStorage
    if (saveData(data)) {
        return { success: true };
    } else {
        return { success: false, error: 'Failed to save data' };
    }
}

/**
 * Detect entity conflicts (double-bookings) within a set of slots at a specific time
 * @param {Object[]} slotsAtTime - Array of slots at a specific day/period
 * @param {string} entityField - Field name to check: 'studentGroupId' or 'roomId'
 * @param {string} conflictType - Type of conflict: 'studentGroup' or 'room'
 * @param {Object} entities - Entity lookup object (studentGroups or rooms)
 * @param {Object} teachers - Teachers lookup object
 * @param {string} day - Day of the week
 * @param {number} period - Period number
 * @param {Object} conflictMap - Map to populate with conflicts (slotId -> array of conflicts)
 */
function detectEntityConflicts(slotsAtTime, entityField, conflictType, entities, teachers, day, period, conflictMap) {
    // Group slots by entity ID
    const entityGroups = {};

    for (const slot of slotsAtTime) {
        const entityId = slot[entityField];
        // Skip null/empty entity values
        if (!entityId) continue;

        if (!entityGroups[entityId]) {
            entityGroups[entityId] = [];
        }
        entityGroups[entityId].push(slot);
    }

    // Find conflicts (entities appearing in multiple slots)
    for (const [entityId, slots] of Object.entries(entityGroups)) {
        if (slots.length <= 1) continue;

        // This entity is double-booked
        const entity = entities[entityId];
        const entityName = entity ? entity.name : `Unknown (${entityId})`;
        const slotIds = slots.map(s => s.id);
        const involvedTeachers = slots.map(s => {
            const teacher = teachers[s.teacherId];
            return teacher ? teacher.name : `Unknown (${s.teacherId})`;
        });

        // Add conflict to each affected slot
        for (let i = 0; i < slots.length; i++) {
            const slot = slots[i];
            const otherTeachers = involvedTeachers.filter((_, idx) => idx !== i);

            if (!conflictMap[slot.id]) {
                conflictMap[slot.id] = [];
            }

            conflictMap[slot.id].push({
                type: conflictType,
                entityId: entityId,
                entityName: entityName,
                day: day,
                period: period,
                slotIds: slotIds,
                involvedTeachers: involvedTeachers,
                otherTeachers: otherTeachers
            });
        }
    }
}

/**
 * Detect all scheduling conflicts in the timetable
 * @param {Object} data - TimetableData object
 * @returns {Object} Conflict map: slotId -> array of conflict objects
 */
function detectConflicts(data) {
    const conflictMap = {}; // slotId -> array of conflict objects

    if (!data || !data.slots || !data.periods) {
        return conflictMap;
    }

    for (const day of DAYS) {
        for (const period of data.periods) {
            const slotsAtTime = getSlotsForDayPeriod(data.slots, day, period.id);

            // Check student group conflicts
            detectEntityConflicts(
                slotsAtTime,
                'studentGroupId',
                'studentGroup',
                data.studentGroups || {},
                data.teachers || {},
                day,
                period,
                conflictMap
            );

            // Check room conflicts
            detectEntityConflicts(
                slotsAtTime,
                'roomId',
                'room',
                data.rooms || {},
                data.teachers || {},
                day,
                period,
                conflictMap
            );
        }
    }

    return conflictMap;
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
    const fieldMap = {
        'studentGroups': 'studentGroupId',
        'rooms': 'roomId',
        'subjects': 'subjectId'
    };

    const field = fieldMap[entityType];
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
        DAYS,
        STORAGE_KEY,
        createEmptyTimetableData,
        generateEntityId,
        generateSlotId,
        createSlotsForTeacher,
        createAllSlots,
        getSlotById,
        getSlotsForTeacher,
        getSlotsForDayPeriod,
        getSlotsForEntity,
        parseTextareaToNames,
        validatePeriods,
        validateEntityNames,
        validateAllInputs,
        hasValidationErrors,
        findEntityIdByName,
        syncEntities,
        orphanSlotReferences,
        validateTimetableData,
        importFromFile,
        detectEntityConflicts,
        detectConflicts,
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
