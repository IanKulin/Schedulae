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
        getSlotsForDayPeriod
    };
}
