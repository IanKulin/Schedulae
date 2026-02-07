/**
 * Schedulae - Main Application Logic
 */

// Create debounced save function for auto-save (500ms delay)
let debouncedSave;

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
 * Save current data to LocalStorage
 * Called by the debounced auto-save mechanism
 * @param {Object} data - TimetableData object to save
 */
function saveChanges(data) {
    if (!saveData(data)) {
        console.error('Auto-save failed');
    }
}

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
 * Initialize the Data Entry page
 * Populates form fields with existing data if available
 */
function initDataEntryPage() {
    const data = loadData();
    const dataExists = data !== null;

    // Get form elements
    const periodsInput = $('#periods-input');
    const teachersInput = $('#teachers-input');
    const studentGroupsInput = $('#studentgroups-input');
    const roomsInput = $('#rooms-input');
    const subjectsInput = $('#subjects-input');
    const cancelButton = $('#cancel-button');
    const mainViewLink = $('#nav-main-view-from-entry');
    const saveFileButton = $('#save-file-button');

    // Clear any existing error messages
    clearFieldErrors();
    clearFileStatus();

    // Update Save to File button state
    if (saveFileButton) {
        saveFileButton.disabled = !dataExists;
    }

    if (dataExists) {
        // Populate periods (and disable field since changing periods after data exists is not supported)
        periodsInput.value = data.periods.length;
        periodsInput.disabled = true;

        // Populate teachers
        teachersInput.value = entitiesToText(data.teachers);

        // Populate student groups
        studentGroupsInput.value = entitiesToText(data.studentGroups);

        // Populate rooms
        roomsInput.value = entitiesToText(data.rooms);

        // Populate subjects
        subjectsInput.value = entitiesToText(data.subjects);

        // Show cancel button and Main View link when data exists
        cancelButton.classList.remove('page-hidden');
        if (mainViewLink) mainViewLink.classList.remove('page-hidden');
    } else {
        // Reset form to defaults
        periodsInput.value = 6;
        periodsInput.disabled = false;
        teachersInput.value = '';
        studentGroupsInput.value = '';
        roomsInput.value = '';
        subjectsInput.value = '';

        // Hide cancel button and Main View link for first-time users
        cancelButton.classList.add('page-hidden');
        if (mainViewLink) mainViewLink.classList.add('page-hidden');
    }
}

/**
 * Convert an entities object to text (one name per line)
 * Maintains entry order based on entity IDs
 * @param {Object} entities - Object with entity IDs as keys
 * @returns {string} Names separated by newlines
 */
function entitiesToText(entities) {
    if (!entities || Object.keys(entities).length === 0) {
        return '';
    }

    // Sort by ID (numeric order) to maintain entry order
    const sortedIds = Object.keys(entities).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    return sortedIds.map(id => entities[id].name).join('\n');
}

/**
 * Show an error message for a specific field
 * @param {string} fieldId - Base ID of the field (without -input suffix)
 * @param {string} message - Error message to display
 */
function showFieldError(fieldId, message) {
    const errorElement = $(`#${fieldId}-error`);
    if (errorElement) {
        errorElement.textContent = message;
    }
}

/**
 * Clear all field error messages
 */
function clearFieldErrors() {
    $$('.field-error').forEach(el => {
        el.textContent = '';
    });
}

/**
 * Handle cancel button click
 * Discards form changes and returns to Main View
 */
function handleCancel() {
    showPage('main-view');
}

/**
 * Handle form submission
 * Validates inputs, updates entities, creates slots, saves to LocalStorage
 * @param {Event} event - Form submit event
 */
function handleFormSubmit(event) {
    event.preventDefault();

    // Clear previous errors
    clearFieldErrors();

    // Get form values
    const periodsInput = $('#periods-input');
    const teachersInput = $('#teachers-input');
    const studentGroupsInput = $('#studentgroups-input');
    const roomsInput = $('#rooms-input');
    const subjectsInput = $('#subjects-input');

    // Parse textarea values into name arrays
    const formData = {
        periods: periodsInput.value,
        teachers: parseTextareaToNames(teachersInput.value),
        studentGroups: parseTextareaToNames(studentGroupsInput.value),
        rooms: parseTextareaToNames(roomsInput.value),
        subjects: parseTextareaToNames(subjectsInput.value)
    };

    // Validate all inputs
    const errors = validateAllInputs(formData);

    // Display any errors
    if (hasValidationErrors(errors)) {
        if (errors.periods) showFieldError('periods', errors.periods);
        if (errors.teachers) showFieldError('teachers', errors.teachers);
        if (errors.studentGroups) showFieldError('studentgroups', errors.studentGroups);
        if (errors.rooms) showFieldError('rooms', errors.rooms);
        if (errors.subjects) showFieldError('subjects', errors.subjects);
        return;
    }

    // Load existing data or create new
    let data = loadData();
    const isFirstSave = data === null;

    if (isFirstSave) {
        data = createEmptyTimetableData(parseInt(formData.periods, 10));
    }

    // Sync teachers and track new ones (for slot creation)
    const teacherSync = syncEntities(data.teachers, formData.teachers, 'teachers', data);
    const newTeacherIds = Object.keys(teacherSync.entities).filter(
        id => !data.teachers[id]
    );

    // For deleted teachers, we need to remove their slots entirely
    // (slots are uniquely tied to teachers)
    if (teacherSync.deletedIds.length > 0) {
        const deletedTeacherSet = new Set(teacherSync.deletedIds);
        data.slots = data.slots.filter(slot => !deletedTeacherSet.has(slot.teacherId));
    }

    data.teachers = teacherSync.entities;

    // Sync other entities and orphan their slot references
    const studentGroupSync = syncEntities(data.studentGroups, formData.studentGroups, 'studentGroups', data);
    data.slots = orphanSlotReferences(data.slots, 'studentGroupId', studentGroupSync.deletedIds);
    data.studentGroups = studentGroupSync.entities;

    const roomSync = syncEntities(data.rooms, formData.rooms, 'rooms', data);
    data.slots = orphanSlotReferences(data.slots, 'roomId', roomSync.deletedIds);
    data.rooms = roomSync.entities;

    const subjectSync = syncEntities(data.subjects, formData.subjects, 'subjects', data);
    data.slots = orphanSlotReferences(data.slots, 'subjectId', subjectSync.deletedIds);
    data.subjects = subjectSync.entities;

    // Create slots for new teachers
    for (const teacherId of newTeacherIds) {
        const newSlots = createSlotsForTeacher(teacherId, data.periods);
        data.slots.push(...newSlots);
    }

    // Save to LocalStorage
    if (saveData(data)) {
        showPage('main-view');
    } else {
        // Show generic error if save fails
        showFieldError('periods', 'Failed to save data. Please try again.');
    }
}

/**
 * Set up event listeners for the Data Entry form
 */
function setupDataEntryEventListeners() {
    const form = $('#data-entry-form');
    const cancelButton = $('#cancel-button');
    const mainViewLink = $('#nav-main-view-from-entry');
    const saveFileButton = $('#save-file-button');
    const loadFileButton = $('#load-file-button');
    const fileInput = $('#file-input');

    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    if (cancelButton) {
        cancelButton.addEventListener('click', handleCancel);
    }

    if (mainViewLink) {
        mainViewLink.addEventListener('click', (e) => {
            e.preventDefault();
            showPage('main-view');
        });
    }

    // File operation event listeners
    if (saveFileButton) {
        saveFileButton.addEventListener('click', handleSaveToFile);
    }

    if (loadFileButton) {
        loadFileButton.addEventListener('click', handleLoadFromFile);
    }

    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelected);
    }
}

/**
 * Handle Save to File button click
 * Exports current timetable data to a JSON file
 */
function handleSaveToFile() {
    if (exportToFile()) {
        showFileStatus('Timetable saved successfully', false);
    }
}

/**
 * Handle Load from File button click
 * Opens file picker for JSON file selection
 */
function handleLoadFromFile() {
    const fileInput = $('#file-input');
    if (fileInput) {
        fileInput.value = ''; // Reset to allow re-selecting same file
        fileInput.click();
    }
}

/**
 * Handle file selection from file picker
 * @param {Event} event - Change event from file input
 */
async function handleFileSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();

        // Check if data already exists and ask for confirmation
        if (hasExistingData()) {
            if (!confirm('Loading this file will replace your current timetable. Continue?')) {
                return;
            }
        }

        // Import the file
        const result = importFromFile(text);

        if (result.success) {
            showFileStatus('Timetable loaded successfully', false);
            // Reinitialize the page to show loaded data
            initDataEntryPage();
        } else {
            showFileStatus(result.error, true);
        }
    } catch (err) {
        showFileStatus('Invalid file: Not valid JSON', true);
    }
}

/**
 * Show status message in the file operations section
 * @param {string} message - Message to display
 * @param {boolean} isError - True for error styling, false for success
 */
function showFileStatus(message, isError) {
    const statusEl = $('#file-status');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = 'file-status ' + (isError ? 'error' : 'success');

        // Auto-dismiss after 3 seconds
        setTimeout(() => {
            if (statusEl.textContent === message) {
                statusEl.textContent = '';
                statusEl.className = 'file-status';
            }
        }, 3000);
    }
}

/**
 * Clear the file status message
 */
function clearFileStatus() {
    const statusEl = $('#file-status');
    if (statusEl) {
        statusEl.textContent = '';
        statusEl.className = 'file-status';
    }
}

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
 * Get entities sorted by ID (entry order)
 * @param {Object} entities - Entities object from TimetableData
 * @returns {Array} Array of [id, entity] pairs sorted by numeric ID
 */
function getSortedEntities(entities) {
    if (!entities) return [];
    return Object.entries(entities).sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10));
}

/**
 * Find a slot for a specific day, period, and teacher
 * @param {Object} data - TimetableData object
 * @param {string} day - Day of the week
 * @param {number} period - Period number
 * @param {string} teacherId - Teacher ID
 * @returns {Object|undefined} The slot or undefined if not found
 */
function getSlotForCell(data, day, period, teacherId) {
    return data.slots.find(slot =>
        slot.day === day &&
        slot.period === period &&
        slot.teacherId === teacherId
    );
}

/**
 * Create a dropdown (select element) for a cell
 * @param {string} type - Type of dropdown: 'studentGroup', 'room', 'subject'
 * @param {Array} options - Array of [id, entity] pairs
 * @param {string|null} selectedId - Currently selected entity ID
 * @param {string} slotId - ID of the slot this dropdown belongs to
 * @returns {HTMLSelectElement} The created select element
 */
function createDropdown(type, options, selectedId, slotId) {
    const select = document.createElement('select');
    select.className = 'cell-dropdown';
    select.dataset.slotId = slotId;
    select.dataset.field = type + 'Id'; // e.g., 'studentGroupId', 'roomId', 'subjectId'

    // Add blank option first
    const blankOption = document.createElement('option');
    blankOption.value = '';
    blankOption.textContent = '\u2014'; // em-dash
    select.appendChild(blankOption);

    // Add entity options in entry order
    for (const [id, entity] of options) {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = entity.name;
        if (id === selectedId) {
            option.selected = true;
        }
        select.appendChild(option);
    }

    return select;
}

/**
 * Create the cell content with three dropdowns
 * @param {Object} data - TimetableData object
 * @param {Object} slot - The slot object for this cell
 * @returns {DocumentFragment} Fragment containing the dropdowns
 */
function createCellContent(data, slot) {
    const fragment = document.createDocumentFragment();

    // Get sorted entities for each dropdown
    const studentGroups = getSortedEntities(data.studentGroups);
    const rooms = getSortedEntities(data.rooms);
    const subjects = getSortedEntities(data.subjects);

    // Create StudentGroup dropdown
    const sgDropdown = createDropdown('studentGroup', studentGroups, slot.studentGroupId, slot.id);
    sgDropdown.title = 'Student Group';
    fragment.appendChild(sgDropdown);

    // Create Room dropdown
    const roomDropdown = createDropdown('room', rooms, slot.roomId, slot.id);
    roomDropdown.title = 'Room';
    fragment.appendChild(roomDropdown);

    // Create Subject dropdown
    const subjectDropdown = createDropdown('subject', subjects, slot.subjectId, slot.id);
    subjectDropdown.title = 'Subject';
    fragment.appendChild(subjectDropdown);

    return fragment;
}

/**
 * Initialize the Main View page
 * Renders the timetable grid or shows empty state
 */
function initMainViewPage() {
    const data = loadData();
    const emptyState = $('#empty-state');
    const gridContainer = $('#grid-container');

    // Check if there are any teachers
    const hasTeachers = data && data.teachers && Object.keys(data.teachers).length > 0;

    if (!hasTeachers) {
        // Show empty state, hide grid
        emptyState.classList.remove('page-hidden');
        gridContainer.classList.add('page-hidden');
    } else {
        // Hide empty state, show grid
        emptyState.classList.add('page-hidden');
        gridContainer.classList.remove('page-hidden');
        renderMainViewGrid(data);
    }
}

/**
 * Get teachers sorted by ID (entry order)
 * @param {Object} teachers - Teachers object from TimetableData
 * @returns {Array} Array of [id, teacher] pairs sorted by numeric ID
 */
function getSortedTeachers(teachers) {
    return Object.entries(teachers).sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10));
}

/**
 * Render the main timetable grid
 * @param {Object} data - TimetableData object
 */
function renderMainViewGrid(data) {
    const grid = $('#timetable-grid');
    const teachers = getSortedTeachers(data.teachers);
    const periods = data.periods;
    const numTeachers = teachers.length;

    // Clear existing grid content
    grid.innerHTML = '';

    // Set up grid columns: row header (180px) + teachers (200px each)
    grid.style.gridTemplateColumns = `180px repeat(${numTeachers}, 200px)`;

    // Create corner cell
    const corner = document.createElement('div');
    corner.className = 'grid-cell grid-corner';
    corner.textContent = '';
    grid.appendChild(corner);

    // Create header row (teacher names)
    for (const [, teacher] of teachers) {
        const header = document.createElement('div');
        header.className = 'grid-cell grid-header';
        header.textContent = teacher.name;
        header.title = teacher.name; // Show full name on hover for truncated text
        grid.appendChild(header);
    }

    // Create data rows (day/period combinations)
    for (const day of DAYS) {
        for (const period of periods) {
            // Row header (day + period)
            const rowHeader = document.createElement('div');
            rowHeader.className = 'grid-cell grid-row-header';
            rowHeader.dataset.day = day;
            rowHeader.innerHTML = `<span class="row-header-day">${DAY_ABBREVIATIONS[day]}</span><span class="row-header-period"> - P${period}</span>`;
            grid.appendChild(rowHeader);

            // Data cells for each teacher
            for (const [teacherId] of teachers) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell grid-data-cell';
                cell.dataset.day = day;
                cell.dataset.period = period;
                cell.dataset.teacherId = teacherId;

                // Find the slot for this cell
                const slot = getSlotForCell(data, day, period, teacherId);
                if (slot) {
                    cell.appendChild(createCellContent(data, slot));
                }

                grid.appendChild(cell);
            }
        }
    }
}

/**
 * Handle dropdown change event
 * Updates the slot data when a selection is made
 * @param {Event} event - Change event from dropdown
 */
function handleDropdownChange(event) {
    const select = event.target;

    // Ensure this is a cell dropdown
    if (!select.classList.contains('cell-dropdown')) {
        return;
    }

    const slotId = select.dataset.slotId;
    const field = select.dataset.field; // e.g., 'studentGroupId'
    const newValue = select.value || null; // Convert empty string to null

    // Load current data
    const data = loadData();
    if (!data) {
        console.error('No data found when handling dropdown change');
        return;
    }

    // Find and update the slot
    const slot = data.slots.find(s => s.id === slotId);
    if (slot) {
        slot[field] = newValue;

        // Use debounced auto-save (500ms delay)
        debouncedSave(data);
    } else {
        console.error('Slot not found:', slotId);
    }
}

/**
 * Set up event listeners for Main View navigation
 */
function setupMainViewEventListeners() {
    const dataEntryLink = $('#nav-data-entry');
    const emptyStateLink = $('#empty-state-link');
    const grid = $('#timetable-grid');
    const teacherTimetablesLink = $('#nav-teacher-timetables');
    const studentGroupTimetablesLink = $('#nav-studentgroup-timetables');
    const roomTimetablesLink = $('#nav-room-timetables');

    if (dataEntryLink) {
        dataEntryLink.addEventListener('click', (e) => {
            e.preventDefault();
            showPage('data-entry');
        });
    }

    if (emptyStateLink) {
        emptyStateLink.addEventListener('click', (e) => {
            e.preventDefault();
            showPage('data-entry');
        });
    }

    // Derived view navigation links
    if (teacherTimetablesLink) {
        teacherTimetablesLink.addEventListener('click', (e) => {
            e.preventDefault();
            showDerivedViewIndex('teachers');
        });
    }

    if (studentGroupTimetablesLink) {
        studentGroupTimetablesLink.addEventListener('click', (e) => {
            e.preventDefault();
            showDerivedViewIndex('studentGroups');
        });
    }

    if (roomTimetablesLink) {
        roomTimetablesLink.addEventListener('click', (e) => {
            e.preventDefault();
            showDerivedViewIndex('rooms');
        });
    }

    // Event delegation for dropdown changes
    if (grid) {
        grid.addEventListener('change', handleDropdownChange);
    }
}

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
        <main class="derived-view-content">
            <h2>${config.title}</h2>
            ${entityListHtml}
        </main>
    `;

    // Add navigation listeners
    setupDerivedViewNavigation(entityType);
}

/**
 * Set up navigation event listeners for derived views
 * @param {string} currentEntityType - Currently displayed entity type (for index pages)
 */
function setupDerivedViewNavigation(currentEntityType) {
    // Back to main view
    const backToMainLinks = $$('#nav-back-to-main-from-index, #nav-back-to-main-from-individual');
    backToMainLinks.forEach(link => {
        if (link) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                showPage('main-view');
            });
        }
    });

    // Derived view navigation links (from index pages)
    const teacherLink = $('#nav-teacher-timetables-from-index');
    if (teacherLink && !teacherLink.classList.contains('nav-active')) {
        teacherLink.addEventListener('click', (e) => {
            e.preventDefault();
            showDerivedViewIndex('teachers');
        });
    }

    const studentGroupLink = $('#nav-studentgroup-timetables-from-index');
    if (studentGroupLink && !studentGroupLink.classList.contains('nav-active')) {
        studentGroupLink.addEventListener('click', (e) => {
            e.preventDefault();
            showDerivedViewIndex('studentGroups');
        });
    }

    const roomLink = $('#nav-room-timetables-from-index');
    if (roomLink && !roomLink.classList.contains('nav-active')) {
        roomLink.addEventListener('click', (e) => {
            e.preventDefault();
            showDerivedViewIndex('rooms');
        });
    }

    // Derived view navigation links (from individual pages)
    const teacherLinkIndiv = $('#nav-teacher-timetables-from-individual');
    if (teacherLinkIndiv && !teacherLinkIndiv.classList.contains('nav-active')) {
        teacherLinkIndiv.addEventListener('click', (e) => {
            e.preventDefault();
            showDerivedViewIndex('teachers');
        });
    }

    const studentGroupLinkIndiv = $('#nav-studentgroup-timetables-from-individual');
    if (studentGroupLinkIndiv && !studentGroupLinkIndiv.classList.contains('nav-active')) {
        studentGroupLinkIndiv.addEventListener('click', (e) => {
            e.preventDefault();
            showDerivedViewIndex('studentGroups');
        });
    }

    const roomLinkIndiv = $('#nav-room-timetables-from-individual');
    if (roomLinkIndiv && !roomLinkIndiv.classList.contains('nav-active')) {
        roomLinkIndiv.addEventListener('click', (e) => {
            e.preventDefault();
            showDerivedViewIndex('rooms');
        });
    }

    // Add entity link listeners
    $$('.entity-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const type = link.dataset.entityType;
            const id = link.dataset.entityId;
            showIndividualTimetable(type, id);
        });
    });

    // Add link to data entry if no entities
    const addEntitiesLink = $('#add-entities-link');
    if (addEntitiesLink) {
        addEntitiesLink.addEventListener('click', (e) => {
            e.preventDefault();
            showPage('data-entry');
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
        <main class="derived-view-content">
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

/**
 * Initialize the application
 */
function initApp() {
    // Initialize debounced auto-save (500ms delay)
    debouncedSave = debounce(saveChanges, 500);

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
