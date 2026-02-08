/**
 * Schedulae - Utility Functions
 */

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
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
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
    module.exports = { DAY_ABBREVIATIONS, escapeHtml, getSortedEntities, debounce, getDateString };
}
