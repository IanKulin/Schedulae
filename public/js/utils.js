/**
 * Schedulae - Utility Functions
 */

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
    module.exports = { debounce, getDateString };
}
