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

    // Clear any existing error messages
    clearFieldErrors();

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

        // Show cancel button when data exists
        cancelButton.classList.remove('page-hidden');
    } else {
        // Reset form to defaults
        periodsInput.value = 6;
        periodsInput.disabled = false;
        teachersInput.value = '';
        studentGroupsInput.value = '';
        roomsInput.value = '';
        subjectsInput.value = '';

        // Hide cancel button for first-time users
        cancelButton.classList.add('page-hidden');
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

    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    if (cancelButton) {
        cancelButton.addEventListener('click', handleCancel);
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
        grid.appendChild(header);
    }

    // Create data rows (day/period combinations)
    for (const day of DAYS) {
        for (const period of periods) {
            // Row header (day + period)
            const rowHeader = document.createElement('div');
            rowHeader.className = 'grid-cell grid-row-header';
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

        // Save immediately (auto-save with debouncing will be added in Sprint 6)
        if (!saveData(data)) {
            console.error('Failed to save data after dropdown change');
        }
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

    // Event delegation for dropdown changes
    if (grid) {
        grid.addEventListener('change', handleDropdownChange);
    }
}

/**
 * Initialize the application
 */
function initApp() {
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
