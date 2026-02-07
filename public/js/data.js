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
        periods.push(i);
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
        orphanSlotReferences
    };
}
