/**
 * Schedulae - Main Application Logic
 */

/**
 * Show a specific page and hide all others
 * @param {string} pageId - ID of the page to show (without 'page-' prefix)
 */
function showPage(pageId) {
    // Hide all pages
    $$('.page').forEach(page => {
        page.classList.add('page-hidden');
        page.classList.remove('page-visible');
    });

    // Show the requested page
    const targetPage = $(`#page-${pageId}`);
    if (targetPage) {
        targetPage.classList.remove('page-hidden');
        targetPage.classList.add('page-visible');
    }
}

/**
 * Initialize the application
 */
function initApp() {
    // Determine which page to show based on existing data
    if (hasExistingData()) {
        showPage('main-view');
    } else {
        showPage('data-entry');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
