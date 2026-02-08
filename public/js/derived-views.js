/**
 * Schedulae - Derived Views Module (Teacher/Class/Room Timetables)
 */

/**
 * Configuration for derived view entity types
 */
const DERIVED_VIEW_CONFIG = {
    'teachers': {
        title: 'Teacher Timetables',
        singularTitle: 'Teacher Timetable',
        slotField: 'teacherId',
        cellFields: ['studentGroupId', 'roomId', 'subjectId'],
        cellLabels: ['Class', 'Room', 'Subject']
    },
    'studentGroups': {
        title: 'Class Timetables',
        singularTitle: 'Class Timetable',
        slotField: 'studentGroupId',
        cellFields: ['teacherId', 'roomId', 'subjectId'],
        cellLabels: ['Teacher', 'Room', 'Subject']
    },
    'rooms': {
        title: 'Room Timetables',
        singularTitle: 'Room Timetable',
        slotField: 'roomId',
        cellFields: ['teacherId', 'studentGroupId', 'subjectId'],
        cellLabels: ['Teacher', 'Class', 'Subject']
    }
};

/**
 * Map entity field IDs to their data source
 */
const ENTITY_FIELD_MAP = {
    'teacherId': 'teachers',
    'studentGroupId': 'studentGroups',
    'roomId': 'rooms',
    'subjectId': 'subjects'
};

/**
 * Show the derived view index page for a specific entity type
 * @param {string} entityType - Type of entity: 'teachers', 'studentGroups', 'rooms'
 */
function showDerivedViewIndex(entityType) {
    showPage('derived-views');

    const data = loadData();
    const config = DERIVED_VIEW_CONFIG[entityType];

    if (!config) {
        console.error('Unknown entity type:', entityType);
        return;
    }

    const entities = data ? data[entityType] : {};
    renderDerivedViewIndex(entityType, entities, config);
}

/**
 * Get the active state class for navigation links based on entity type
 * @param {string} currentType - Currently displayed entity type
 * @param {string} linkType - Link entity type to check
 * @returns {string} 'nav-active' or empty string
 */
function getNavActiveClass(currentType, linkType) {
    return currentType === linkType ? 'nav-active' : '';
}

/**
 * Render the derived view index page
 * @param {string} entityType - Type of entity
 * @param {Object} entities - Entities object from TimetableData
 * @param {Object} config - Configuration for this entity type
 */
function renderDerivedViewIndex(entityType, entities, config) {
    const container = $('#page-derived-views');
    if (!container) return;

    const sortedEntities = getSortedEntities(entities);
    const hasEntities = sortedEntities.length > 0;

    let entityListHtml = '';
    if (hasEntities) {
        entityListHtml = '<ul class="entity-list">';
        for (const [id, entity] of sortedEntities) {
            entityListHtml += `<li><a href="#" class="entity-link" data-entity-type="${entityType}" data-entity-id="${id}" title="${escapeHtml(entity.name)}">${escapeHtml(entity.name)}</a></li>`;
        }
        entityListHtml += '</ul>';
    } else {
        entityListHtml = '<p class="no-entities">No entries found. <a href="#" id="add-entities-link">Go to Data Entry</a> to add some.</p>';
    }

    container.innerHTML = `
        <header class="page-header">
            <h1>Schedulae</h1>
            <nav class="nav-links">
                <a href="#" id="nav-back-to-main-from-index">Main View</a>
                <span class="nav-separator">|</span>
                <a href="#" id="nav-teacher-timetables-from-index" class="${getNavActiveClass(entityType, 'teachers')}">Teacher Timetables</a>
                <a href="#" id="nav-studentgroup-timetables-from-index" class="${getNavActiveClass(entityType, 'studentGroups')}">Class Timetables</a>
                <a href="#" id="nav-room-timetables-from-index" class="${getNavActiveClass(entityType, 'rooms')}">Room Timetables</a>
            </nav>
        </header>
        <main class="content-card derived-view-content">
            <h2>${config.title}</h2>
            ${entityListHtml}
        </main>
    `;

    // Add navigation listeners
    setupDerivedViewNavigation(entityType);
}

/**
 * Set up a click handler for a navigation link if it exists and is not active
 * @param {string} selector - CSS selector for the link
 * @param {Function} handler - Click handler function
 */
function setupNavLink(selector, handler) {
    const link = $(selector);
    if (link && !link.classList.contains('nav-active')) {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            handler();
        });
    }
}

/**
 * Set up navigation links for the three derived view types
 * @param {string} suffix - Link ID suffix ('from-index' or 'from-individual')
 */
function setupDerivedTypeNavigation(suffix) {
    setupNavLink(`#nav-teacher-timetables-${suffix}`, () => showDerivedViewIndex('teachers'));
    setupNavLink(`#nav-studentgroup-timetables-${suffix}`, () => showDerivedViewIndex('studentGroups'));
    setupNavLink(`#nav-room-timetables-${suffix}`, () => showDerivedViewIndex('rooms'));
}

/**
 * Set up navigation event listeners for derived views
 * @param {string} currentEntityType - Currently displayed entity type (for index pages)
 */
function setupDerivedViewNavigation(currentEntityType) {
    // Back to main view
    $$('#nav-back-to-main-from-index, #nav-back-to-main-from-individual').forEach(link => {
        if (link) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                showPage('main-view');
            });
        }
    });

    // Derived view type navigation (both index and individual pages)
    setupDerivedTypeNavigation('from-index');
    setupDerivedTypeNavigation('from-individual');

    // Entity links
    $$('.entity-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showIndividualTimetable(link.dataset.entityType, link.dataset.entityId);
        });
    });

    // Data entry link for empty state
    setupNavLink('#add-entities-link', () => showPage('data-entry'));
}

/**
 * Show an individual timetable for a specific entity
 * @param {string} entityType - Type of entity
 * @param {string} entityId - ID of the entity
 */
function showIndividualTimetable(entityType, entityId) {
    const data = loadData();
    if (!data) return;

    const config = DERIVED_VIEW_CONFIG[entityType];
    if (!config) return;

    const entity = data[entityType][entityId];
    if (!entity) return;

    renderIndividualTimetable(entityType, entityId, entity, data, config);
}

/**
 * Render an individual timetable grid
 * @param {string} entityType - Type of entity
 * @param {string} entityId - ID of the entity
 * @param {Object} entity - The entity object
 * @param {Object} data - Full TimetableData
 * @param {Object} config - Configuration for this entity type
 */
function renderIndividualTimetable(entityType, entityId, entity, data, config) {
    const container = $('#page-derived-views');
    if (!container) return;

    // Get slots for this entity
    const slots = getSlotsForEntity(entityType, entityId, data.slots);

    // Build a lookup map: day -> period -> slot
    const slotMap = {};
    for (const slot of slots) {
        if (!slotMap[slot.day]) {
            slotMap[slot.day] = {};
        }
        slotMap[slot.day][slot.period] = slot;
    }

    container.innerHTML = `
        <header class="page-header">
            <h1>Schedulae</h1>
            <nav class="nav-links">
                <a href="#" id="nav-back-to-main-from-individual">Main View</a>
                <span class="nav-separator">|</span>
                <a href="#" id="nav-teacher-timetables-from-individual" class="${getNavActiveClass(entityType, 'teachers')}">Teacher Timetables</a>
                <a href="#" id="nav-studentgroup-timetables-from-individual" class="${getNavActiveClass(entityType, 'studentGroups')}">Class Timetables</a>
                <a href="#" id="nav-room-timetables-from-individual" class="${getNavActiveClass(entityType, 'rooms')}">Room Timetables</a>
            </nav>
        </header>
        <main class="content-card derived-view-content">
            <h2>${escapeHtml(entity.name)}</h2>
            <p class="breadcrumb"><a href="#" id="nav-back-to-index">&larr; Back to ${config.title}</a></p>
            <div class="individual-grid-wrapper">
                <div id="individual-timetable-grid" class="individual-timetable-grid"></div>
            </div>
        </main>
    `;

    // Render the grid
    const grid = $('#individual-timetable-grid');
    renderIndividualGrid(grid, data, slotMap, config);

    // Add navigation listeners
    const backToIndexLink = $('#nav-back-to-index');
    if (backToIndexLink) {
        backToIndexLink.addEventListener('click', (e) => {
            e.preventDefault();
            showDerivedViewIndex(entityType);
        });
    }

    setupDerivedViewNavigation(entityType);
}

/**
 * Render the individual timetable grid content
 * @param {HTMLElement} grid - Grid container element
 * @param {Object} data - Full TimetableData
 * @param {Object} slotMap - Map of day -> period -> slot
 * @param {Object} config - Configuration for this entity type
 */
function renderIndividualGrid(grid, data, slotMap, config) {
    const periods = data.periods;

    // Set grid columns: period header + 5 days
    grid.style.gridTemplateColumns = '100px repeat(5, 1fr)';

    // Create corner cell
    const corner = document.createElement('div');
    corner.className = 'grid-cell grid-corner individual-grid-corner';
    corner.textContent = '';
    grid.appendChild(corner);

    // Create day headers
    for (const day of DAYS) {
        const header = document.createElement('div');
        header.className = 'grid-cell grid-header individual-grid-header';
        header.textContent = DAY_ABBREVIATIONS[day];
        grid.appendChild(header);
    }

    // Create rows for each period
    for (const period of periods) {
        // Period row header
        const rowHeader = document.createElement('div');
        rowHeader.className = 'grid-cell grid-row-header individual-grid-row-header';
        rowHeader.textContent = `P${period}`;
        grid.appendChild(rowHeader);

        // Cells for each day
        for (const day of DAYS) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell individual-grid-cell';
            cell.dataset.day = day;
            cell.dataset.period = period;

            const slot = slotMap[day] && slotMap[day][period];
            if (slot) {
                cell.appendChild(createIndividualCellContent(slot, data, config));
            } else {
                // Empty cell
                cell.innerHTML = '<span class="empty-cell">\u2014</span>';
            }

            grid.appendChild(cell);
        }
    }
}

/**
 * Create read-only content for an individual timetable cell
 * @param {Object} slot - The slot object
 * @param {Object} data - Full TimetableData
 * @param {Object} config - Configuration for this entity type
 * @returns {DocumentFragment} Fragment containing the cell content
 */
function createIndividualCellContent(slot, data, config) {
    const fragment = document.createDocumentFragment();
    let hasContent = false;

    for (let i = 0; i < config.cellFields.length; i++) {
        const field = config.cellFields[i];
        const label = config.cellLabels[i];
        const entityId = slot[field];

        const line = document.createElement('div');
        line.className = 'individual-cell-line';

        if (entityId) {
            const entityType = ENTITY_FIELD_MAP[field];
            const entity = data[entityType] && data[entityType][entityId];
            if (entity) {
                line.innerHTML = `<span class="cell-label">${escapeHtml(label)}:</span> <span class="cell-value" title="${escapeHtml(entity.name)}">${escapeHtml(entity.name)}</span>`;
                hasContent = true;
            } else {
                line.innerHTML = `<span class="cell-label">${escapeHtml(label)}:</span> <span class="cell-value empty">\u2014</span>`;
            }
        } else {
            line.innerHTML = `<span class="cell-label">${escapeHtml(label)}:</span> <span class="cell-value empty">\u2014</span>`;
        }

        fragment.appendChild(line);
    }

    // If no content at all, show em-dash
    if (!hasContent) {
        const emptySpan = document.createElement('span');
        emptySpan.className = 'empty-cell';
        emptySpan.textContent = '\u2014';
        // Clear the fragment and just show empty
        while (fragment.firstChild) {
            fragment.removeChild(fragment.firstChild);
        }
        fragment.appendChild(emptySpan);
    }

    return fragment;
}

// Export for Node.js testing (ignored in browser)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DERIVED_VIEW_CONFIG,
        ENTITY_FIELD_MAP,
        getNavActiveClass
    };
}
