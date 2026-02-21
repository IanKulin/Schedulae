/**
 * Schedulae - Utility Functions
 */

// UI timing constants (milliseconds)
const AUTOSAVE_DEBOUNCE_MS    = 500;  // debounce delay for grid slot auto-save
const SAVE_CONFIRM_DISPLAY_MS = 1500; // how long "Saved ✓" stays on save button
const FILE_STATUS_DISPLAY_MS  = 3000; // how long file-status messages auto-dismiss

// Grid layout constants
const GRID_TIMESLOT_COL_WIDTH = '180px'; // width of the first (time-slot) column
const GRID_TEACHER_COL_WIDTH  = '200px'; // width of each teacher column

/**
 * Abbreviated day names for display
 */
const DAY_ABBREVIATIONS = {
    "Monday": "Mon",
    "Tuesday": "Tue",
    "Wednesday": "Wed",
    "Thursday": "Thu",
    "Friday": "Fri"
};

// HTML-injection policy:
// - Use .textContent when inserting plain text into a single element.
// - Use .innerHTML only when markup structure is needed; every piece of
//   user-supplied data in the template must be wrapped in escapeHtml().
/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Get entities sorted by ID (entry order)
 * @param {Object} entities - Entities object from TimetableData
 * @returns {Array} Array of [id, entity] pairs sorted by numeric ID
 */
function getSortedEntities(entities) {
    if (!entities) return [];
    return Object.entries(entities).sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10));
}

/**
 * Query shorthand for document.querySelector
 * @param {string} selector - CSS selector
 * @returns {Element|null}
 */
function $(selector) {
    return document.querySelector(selector);
}

/**
 * Query shorthand for document.querySelectorAll (returns array)
 * @param {string} selector - CSS selector
 * @returns {Element[]}
 */
function $$(selector) {
    return Array.from(document.querySelectorAll(selector));
}

/**
 * Debounce function - delays execution until after wait ms have elapsed
 * since the last call
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function}
 */
function debounce(fn, delay) {
    let timeoutId;
    function debounced(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    }
    debounced.cancel = function () {
        clearTimeout(timeoutId);
    };
    return debounced;
}

/**
 * Get current date as YYYY-MM-DD string
 * @returns {string} Date in YYYY-MM-DD format
 */
function getDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Export for Node.js testing (ignored in browser)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AUTOSAVE_DEBOUNCE_MS,
        SAVE_CONFIRM_DISPLAY_MS,
        FILE_STATUS_DISPLAY_MS,
        GRID_TIMESLOT_COL_WIDTH,
        GRID_TEACHER_COL_WIDTH,
        DAY_ABBREVIATIONS,
        escapeHtml,
        getSortedEntities,
        debounce,
        getDateString
    };
}
