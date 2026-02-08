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

    // Update global navigation active state
    updateGlobalNavActiveState(pageId);

    // Run page-specific initialization
    if (pageId === 'setup') {
        initDataEntryPage();
    } else if (pageId === 'builder') {
        initMainViewPage();
    } else if (pageId === 'timetables') {
        initTimetablesPage();
    }
}

/**
 * Update the global navigation to highlight the active section
 * @param {string} pageId - Current page ID
 */
function updateGlobalNavActiveState(pageId) {
    // Remove active state from all nav links
    $$('.global-nav a').forEach(link => {
        link.classList.remove('nav-active');
    });

    // Map page IDs to nav sections
    // 'individual-timetable' belongs to 'timetables' section
    let navSection = pageId;
    if (pageId === 'individual-timetable') {
        navSection = 'timetables';
    }

    // Add active state to current section
    const activeLink = $(`.global-nav a[data-nav="${navSection}"]`);
    if (activeLink) {
        activeLink.classList.add('nav-active');
    }
}

/**
 * Set up global navigation event listeners
 */
function setupGlobalNavigation() {
    const navBuilder = $('#nav-builder');
    const navSetup = $('#nav-setup');
    const navTimetables = $('#nav-timetables');

    if (navBuilder) {
        navBuilder.addEventListener('click', (e) => {
            e.preventDefault();
            showPage('builder');
        });
    }

    if (navSetup) {
        navSetup.addEventListener('click', (e) => {
            e.preventDefault();
            showPage('setup');
        });
    }

    if (navTimetables) {
        navTimetables.addEventListener('click', (e) => {
            e.preventDefault();
            showPage('timetables');
        });
    }
}

/**
 * Initialize the application
 */
function initApp() {
    // Initialize Main View state (debounced auto-save, conflict map)
    MainViewState.init();

    // Set up global navigation
    setupGlobalNavigation();

    // Set up event listeners
    setupDataEntryEventListeners();
    setupMainViewEventListeners();
    setupTimetablesEventListeners();

    // Determine which page to show based on existing data
    if (hasExistingData()) {
        showPage('builder');
    } else {
        showPage('setup');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
