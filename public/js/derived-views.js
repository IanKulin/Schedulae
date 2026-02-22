/**
 * Schedulae - Timetables Module (Teacher/Class/Room Timetables)
 */

/**
 * Configuration for timetable entity types
 */
const TIMETABLE_CONFIG = {
    'teachers': {
        title: 'Teacher Timetables',
        singularTitle: 'Teacher Timetable',
        slotField: 'teacherId',
        cellFields: ['studentGroupId', 'roomId', 'subjectId'],
        cellLabels: ['Class', 'Room', 'Subject'],
        listContainerId: 'teachers-timetable-list',
        sectionId: 'section-teachers'
    },
    'studentGroups': {
        title: 'Class Timetables',
        singularTitle: 'Class Timetable',
        slotField: 'studentGroupId',
        cellFields: ['teacherId', 'roomId', 'subjectId'],
        cellLabels: ['Teacher', 'Room', 'Subject'],
        listContainerId: 'student-groups-timetable-list',
        sectionId: 'section-student-groups'
    },
    'rooms': {
        title: 'Room Timetables',
        singularTitle: 'Room Timetable',
        slotField: 'roomId',
        cellFields: ['teacherId', 'studentGroupId', 'subjectId'],
        cellLabels: ['Teacher', 'Class', 'Subject'],
        listContainerId: 'rooms-timetable-list',
        sectionId: 'section-rooms'
    }
};

/**
 * Map entity field IDs to their data source
 */
const SLOT_FIELD_TO_ENTITY = {
    'teacherId': 'teachers',
    'studentGroupId': 'studentGroups',
    'roomId': 'rooms',
    'subjectId': 'subjects'
};

/**
 * Initialize the Timetables page
 * Populates all three collapsible sections with entity lists
 */
function initTimetablesPage() {
    const data = loadData();

    // Populate each section
    for (const [entityType, config] of Object.entries(TIMETABLE_CONFIG)) {
        const entities = data ? data[entityType] : {};
        populateTimetableSection(entityType, entities, config);
    }
}

/**
 * Populate a timetable section with entity links
 * @param {string} entityType - Type of entity
 * @param {Object} entities - Entities object from TimetableData
 * @param {Object} config - Configuration for this entity type
 */
function populateTimetableSection(entityType, entities, config) {
    const container = $(`#${config.listContainerId}`);
    if (!container) return;

    const sortedEntities = getSortedEntities(entities);

    if (sortedEntities.length === 0) {
        container.innerHTML = '<p class="no-entities">No entries found. <a href="#" class="go-to-setup-link">Go to Setup</a> to add some.</p>';
        return;
    }

    let html = '<ul class="timetable-entity-list">';
    for (const [id, entity] of sortedEntities) {
        html += `<li><a href="#" class="timetable-entity-link" data-entity-type="${entityType}" data-entity-id="${id}" title="${escapeHtml(entity.name)}">${escapeHtml(entity.name)}</a></li>`;
    }
    html += '</ul>';

    container.innerHTML = html;
}

/**
 * Set up event listeners for the Timetables page
 */
function setupTimetablesEventListeners() {
    // Use event delegation on the timetables list container
    const timetablesList = $('#timetables-list');
    if (timetablesList) {
        timetablesList.addEventListener('click', (e) => {
            // Handle entity link clicks
            const entityLink = e.target.closest('.timetable-entity-link');
            if (entityLink) {
                e.preventDefault();
                showIndividualTimetable(entityLink.dataset.entityType, entityLink.dataset.entityId);
                return;
            }

            // Handle "Go to Setup" links
            const setupLink = e.target.closest('.go-to-setup-link');
            if (setupLink) {
                e.preventDefault();
                showPage('setup');
                return;
            }
        });
    }

    // Also set up event delegation for individual timetable page
    const individualPage = $('#page-individual-timetable');
    if (individualPage) {
        individualPage.addEventListener('click', (e) => {
            // Handle "Back to Timetables" link
            const backLink = e.target.closest('#back-to-timetables');
            if (backLink) {
                e.preventDefault();
                showPage('timetables');
                return;
            }

            // Handle print button
            const printBtn = e.target.closest('#print-timetable-btn');
            if (printBtn) {
                e.preventDefault();
                window.print();
                return;
            }
        });
    }
}

/**
 * Show an individual timetable for a specific entity
 * @param {string} entityType - Type of entity
 * @param {string} entityId - ID of the entity
 */
function showIndividualTimetable(entityType, entityId) {
    const data = loadData();
    if (!data) return;

    const config = TIMETABLE_CONFIG[entityType];
    if (!config) return;

    const entity = data[entityType][entityId];
    if (!entity) return;

    renderIndividualTimetable(entityType, entityId, entity, data, config);
    showPage('individual-timetable');
}

/**
 * Render an individual timetable
 * @param {string} entityType - Type of entity
 * @param {string} entityId - ID of the entity
 * @param {Object} entity - The entity object
 * @param {Object} data - Full TimetableData
 * @param {Object} config - Configuration for this entity type
 */
function renderIndividualTimetable(entityType, entityId, entity, data, config) {
    const container = $('#page-individual-timetable');
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
        <main class="content-card individual-timetable-content">
            <div class="individual-timetable-header">
                <h2>${escapeHtml(entity.name)}</h2>
                <div class="individual-timetable-actions">
                    <button type="button" id="print-timetable-btn" class="btn btn-secondary">Print</button>
                </div>
            </div>
            <p class="breadcrumb"><a href="#" id="back-to-timetables">&larr; Back to Timetables</a></p>
            <div class="individual-grid-wrapper">
                <div id="individual-timetable-grid" class="individual-timetable-grid"></div>
            </div>
        </main>
    `;

    // Render the grid
    const grid = $('#individual-timetable-grid');
    renderIndividualGrid(grid, data, slotMap, config);
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
        rowHeader.textContent = period.name;
        grid.appendChild(rowHeader);

        // Cells for each day
        for (const day of DAYS) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell individual-grid-cell';
            cell.dataset.day = day;
            cell.dataset.period = period.id;

            const slot = slotMap[day] && slotMap[day][period.id];
            if (slot) {
                cell.appendChild(createIndividualCellContent(slot, data, config));
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

    for (let i = 0; i < config.cellFields.length; i++) {
        const field = config.cellFields[i];
        const label = config.cellLabels[i];
        const entityId = slot[field];

        if (entityId) {
            const entityType = SLOT_FIELD_TO_ENTITY[field];
            const entity = data[entityType] && data[entityType][entityId];
            if (entity) {
                const line = document.createElement('div');
                line.className = 'individual-cell-line';
                line.innerHTML = `<span class="cell-label">${escapeHtml(label)}:</span> <span class="cell-value" title="${escapeHtml(entity.name)}">${escapeHtml(entity.name)}</span>`;
                fragment.appendChild(line);
            }
        }
    }

    return fragment;
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

// Legacy aliases for backward compatibility with derived-views naming
const DERIVED_VIEW_CONFIG = TIMETABLE_CONFIG;

// Export for Node.js testing (ignored in browser)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TIMETABLE_CONFIG,
        DERIVED_VIEW_CONFIG,
        SLOT_FIELD_TO_ENTITY,
        getNavActiveClass
    };
}
