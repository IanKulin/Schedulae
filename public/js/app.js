/**
 * Schedulae - Main Application Entry Point
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

    // Run page-specific initialization
    if (pageId === 'data-entry') {
        initDataEntryPage();
    } else if (pageId === 'main-view') {
        initMainViewPage();
    }
}

/**
 * Initialize the application
 */
function initApp() {
    // Initialize Main View state (debounced auto-save, conflict map)
    MainViewState.init();

    // Set up event listeners
    setupDataEntryEventListeners();
    setupMainViewEventListeners();

    // Determine which page to show based on existing data
    if (hasExistingData()) {
        showPage('main-view');
    } else {
        showPage('data-entry');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
