/**
 * Schedulae - Main View Page Module
 */

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

// Maps dropdown field names to their conflict type strings (as used in conflict objects)
const FIELD_CONFLICT_TYPE_MAP = {
    studentGroupId: 'studentGroup',
    roomId:         'room',
};

/**
 * Main View module state
 * Encapsulates all mutable state for testing and reset capability
 */
const MainViewState = {
    debouncedSave: null,
    conflictMap: {},
    editingTeacherId: null,
    editingPeriodId: null,

    /**
     * Initialize state (called from initApp)
     */
    init() {
        this.debouncedSave = debounce(saveChanges, 500);
        this.conflictMap = {};
        this.editingTeacherId = null;
        this.editingPeriodId = null;
    },

    /**
     * Reset state (useful for testing)
     */
    reset() {
        this.debouncedSave = null;
        this.conflictMap = {};
        this.editingTeacherId = null;
        this.editingPeriodId = null;
    }
};

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
    select.className = 'dropdown cell-dropdown';
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
 * @param {Object[]} conflicts - Array of conflict objects for this slot (optional)
 * @returns {DocumentFragment} Fragment containing the dropdowns
 */
function createCellContent(data, slot, conflicts) {
    const fragment = document.createDocumentFragment();

    // Get sorted entities for each dropdown
    const studentGroups = getSortedEntities(data.studentGroups);
    const rooms = getSortedEntities(data.rooms);
    const subjects = getSortedEntities(data.subjects);

    // Determine which dropdowns have conflicts
    const conflictTypes = new Set();
    if (conflicts && conflicts.length > 0) {
        for (const conflict of conflicts) {
            conflictTypes.add(conflict.type);
        }
    }

    // Create StudentGroup dropdown
    const sgDropdown = createDropdown('studentGroup', studentGroups, slot.studentGroupId, slot.id);
    sgDropdown.title = 'Student Group';
    if (conflictTypes.has('studentGroup')) {
        sgDropdown.classList.add('dropdown-conflict');
    }
    fragment.appendChild(sgDropdown);

    // Create Room dropdown
    const roomDropdown = createDropdown('room', rooms, slot.roomId, slot.id);
    roomDropdown.title = 'Room';
    if (conflictTypes.has('room')) {
        roomDropdown.classList.add('dropdown-conflict');
    }
    fragment.appendChild(roomDropdown);

    // Create Subject dropdown
    const subjectDropdown = createDropdown('subject', subjects, slot.subjectId, slot.id);
    subjectDropdown.title = 'Subject';
    fragment.appendChild(subjectDropdown);

    return fragment;
}

/**
 * Create the teacher header with name, toggle button, and defaults panel
 * @param {string} teacherId - Teacher ID
 * @param {Object} teacher - Teacher entity object
 * @param {Object} data - TimetableData object
 * @returns {DocumentFragment} Fragment containing the header content
 */
function createTeacherHeader(teacherId, teacher, data) {
    const fragment = document.createDocumentFragment();
    const isEditing = MainViewState.editingTeacherId === teacherId;

    if (isEditing) {
        // Edit mode: [trash] [input] [add]
        const headerRow = document.createElement('div');
        headerRow.className = 'teacher-header-row teacher-header-row--editing';
        headerRow.dataset.teacherId = teacherId;

        const trashBtn = document.createElement('button');
        trashBtn.type = 'button';
        trashBtn.className = 'teacher-edit-trash';
        trashBtn.innerHTML = '&#128465;';
        trashBtn.title = 'Delete teacher';
        headerRow.appendChild(trashBtn);

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'teacher-edit-input';
        input.value = teacher.name;
        headerRow.appendChild(input);

        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'teacher-edit-add';
        addBtn.textContent = '+';
        addBtn.title = 'Add teacher after';
        headerRow.appendChild(addBtn);

        fragment.appendChild(headerRow);
    } else {
        // Display mode: name + toggle
        const headerRow = document.createElement('div');
        headerRow.className = 'teacher-header-row teacher-header-editable';
        headerRow.dataset.teacherId = teacherId;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'teacher-header-name inline-editable-label';
        nameSpan.textContent = teacher.name;
        headerRow.appendChild(nameSpan);

        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'defaults-toggle';
        toggleBtn.dataset.teacherId = teacherId;
        toggleBtn.innerHTML = '&#9660;';
        toggleBtn.title = 'Toggle defaults panel';
        headerRow.appendChild(toggleBtn);

        fragment.appendChild(headerRow);

        // Defaults panel (collapsed by default)
        const panel = createDefaultsPanel(teacherId, data);
        fragment.appendChild(panel);
    }

    return fragment;
}

/**
 * Create the defaults panel with dropdowns and apply button
 * @param {string} teacherId - Teacher ID
 * @param {Object} data - TimetableData object
 * @returns {HTMLDivElement} The defaults panel element
 */
function createDefaultsPanel(teacherId, data) {
    const panel = document.createElement('div');
    panel.className = 'defaults-panel';
    panel.id = `defaults-panel-${teacherId}`;
    panel.dataset.teacherId = teacherId;

    // Get sorted entities for each dropdown
    const studentGroups = getSortedEntities(data.studentGroups);
    const rooms = getSortedEntities(data.rooms);
    const subjects = getSortedEntities(data.subjects);

    // Student Group dropdown
    const sgSelect = createDefaultsDropdown('studentGroupId', studentGroups, teacherId);
    sgSelect.title = 'Default Student Group';
    panel.appendChild(sgSelect);

    // Room dropdown
    const roomSelect = createDefaultsDropdown('roomId', rooms, teacherId);
    roomSelect.title = 'Default Room';
    panel.appendChild(roomSelect);

    // Subject dropdown
    const subjectSelect = createDefaultsDropdown('subjectId', subjects, teacherId);
    subjectSelect.title = 'Default Subject';
    panel.appendChild(subjectSelect);

    // Apply button
    const applyBtn = document.createElement('button');
    applyBtn.type = 'button';
    applyBtn.className = 'defaults-apply-btn';
    applyBtn.dataset.teacherId = teacherId;
    applyBtn.textContent = 'Apply';
    applyBtn.title = 'Fill blank cells with selected defaults';
    panel.appendChild(applyBtn);

    return panel;
}

/**
 * Create a dropdown for the defaults panel
 * @param {string} field - Field name: 'studentGroupId', 'roomId', 'subjectId'
 * @param {Array} options - Array of [id, entity] pairs
 * @param {string} teacherId - Teacher ID
 * @returns {HTMLSelectElement} The created select element
 */
function createDefaultsDropdown(field, options, teacherId) {
    const select = document.createElement('select');
    select.className = 'dropdown defaults-dropdown';
    select.dataset.field = field;
    select.dataset.teacherId = teacherId;

    // Determine label based on field
    const labels = {
        'studentGroupId': 'Student Group',
        'roomId': 'Room',
        'subjectId': 'Subject'
    };

    // Add blank option first
    const blankOption = document.createElement('option');
    blankOption.value = '';
    blankOption.textContent = `— ${labels[field]} —`;
    select.appendChild(blankOption);

    // Add entity options in entry order
    for (const [id, entity] of options) {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = entity.name;
        select.appendChild(option);
    }

    return select;
}

/**
 * Toggle the defaults panel for a teacher
 * @param {string} teacherId - Teacher ID
 */
function toggleDefaultsPanel(teacherId) {
    const panel = document.getElementById(`defaults-panel-${teacherId}`);
    const toggleBtn = document.querySelector(`.defaults-toggle[data-teacher-id="${teacherId}"]`);

    if (panel && toggleBtn) {
        const isExpanded = panel.classList.contains('expanded');

        if (isExpanded) {
            panel.classList.remove('expanded');
            toggleBtn.classList.remove('expanded');
        } else {
            panel.classList.add('expanded');
            toggleBtn.classList.add('expanded');
        }
    }
}

/**
 * Apply default values to blank cells for a teacher
 * @param {string} teacherId - Teacher ID
 */
function applyTeacherDefaults(teacherId) {
    const panel = document.getElementById(`defaults-panel-${teacherId}`);
    if (!panel) return;

    // Get selected values from dropdowns
    const dropdowns = panel.querySelectorAll('.defaults-dropdown');
    const defaults = {};

    for (const dropdown of dropdowns) {
        const field = dropdown.dataset.field;
        const value = dropdown.value;
        if (value) {
            defaults[field] = value;
        }
    }

    // If no selections made, nothing to do
    if (Object.keys(defaults).length === 0) {
        return;
    }

    // Load current data
    const data = loadData();
    if (!data) {
        console.error('No data found when applying defaults');
        return;
    }

    // Find slots for this teacher and update blank fields
    let updated = false;
    for (const slot of data.slots) {
        if (slot.teacherId !== teacherId) continue;

        for (const [field, value] of Object.entries(defaults)) {
            if (slot[field] === null) {
                slot[field] = value;
                updated = true;
            }
        }
    }

    // Save and re-render if any updates were made
    if (updated) {
        saveData(data);
        renderMainViewGrid(data);
        // Conflict highlighting is updated in renderMainViewGrid via detectConflicts
    }

    // Reset dropdowns to blank (panel is re-rendered, so this happens automatically)
}

/**
 * Render the main timetable grid
 * @param {Object} data - TimetableData object
 */
function renderMainViewGrid(data) {
    const grid = $('#timetable-grid');
    const teachers = getSortedEntities(data.teachers);
    const periods = data.periods;
    const numTeachers = teachers.length;

    // Detect conflicts
    MainViewState.conflictMap = detectConflicts(data);

    // Clear existing grid content
    grid.innerHTML = '';

    // Set up grid columns: row header (180px) + teachers (200px each)
    grid.style.gridTemplateColumns = `180px repeat(${numTeachers}, 200px)`;

    // Create corner cell
    const corner = document.createElement('div');
    corner.className = 'grid-cell grid-corner';
    corner.textContent = '';
    grid.appendChild(corner);

    // Create header row (teacher names with defaults panels)
    for (const [teacherId, teacher] of teachers) {
        const header = document.createElement('div');
        header.className = 'grid-cell grid-header has-defaults';
        header.title = teacher.name; // Show full name on hover for truncated text

        // Create header content with toggle and defaults panel
        const headerContent = createTeacherHeader(teacherId, teacher, data);
        header.appendChild(headerContent);

        grid.appendChild(header);
    }

    // Create data rows (day/period combinations)
    for (const day of DAYS) {
        for (const period of periods) {
            // Row header (day + period)
            const rowHeader = document.createElement('div');
            rowHeader.className = 'grid-cell grid-row-header';
            rowHeader.dataset.day = day;

            const isEditingThisPeriod = MainViewState.editingPeriodId === period.id;
            if (isEditingThisPeriod && day === DAYS[0]) {
                // Edit mode — only show input in first (Monday) row
                rowHeader.innerHTML = `<span class="row-header-day">${DAY_ABBREVIATIONS[day]}</span><span class="row-header-period"> - <input type="text" class="period-edit-input" value="${escapeHtml(period.name)}" data-period-id="${period.id}"></span>`;
            } else {
                // Normal mode (or edit mode for non-Monday rows — show read-only)
                rowHeader.innerHTML = `<span class="row-header-day">${DAY_ABBREVIATIONS[day]}</span><span class="row-header-period period-label-editable inline-editable-label" data-period-id="${period.id}"> - ${escapeHtml(period.name)}</span>`;
            }
            grid.appendChild(rowHeader);

            // Data cells for each teacher
            for (const [teacherId] of teachers) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell grid-data-cell';
                cell.dataset.day = day;
                cell.dataset.period = period.id;
                cell.dataset.teacherId = teacherId;

                // Find the slot for this cell
                const slot = getSlotForCell(data, day, period.id, teacherId);
                if (slot) {
                    // Check for conflicts on this slot
                    const conflicts = MainViewState.conflictMap[slot.id] || [];

                    if (conflicts.length > 0) {
                        cell.classList.add('cell-conflict');
                        cell.dataset.conflicts = JSON.stringify(conflicts);
                    }

                    cell.appendChild(createCellContent(data, slot, conflicts));
                }

                grid.appendChild(cell);
            }
        }
    }

    // Focus the edit input if in edit mode
    if (MainViewState.editingTeacherId) {
        const editInput = grid.querySelector('.teacher-edit-input');
        if (editInput) {
            editInput.focus();
            editInput.select();
        }
    }

    if (MainViewState.editingPeriodId) {
        const periodInput = grid.querySelector('.period-edit-input');
        if (periodInput) {
            periodInput.focus();
            periodInput.select();
        }
    }
}

/**
 * Enter teacher edit mode
 * @param {string} teacherId - Teacher ID to edit
 */
function enterTeacherEditMode(teacherId) {
    // Don't enter edit mode if accordion is expanded
    const panel = document.getElementById(`defaults-panel-${teacherId}`);
    if (panel && panel.classList.contains('expanded')) return;

    const data = loadData();
    if (!data) return;
    MainViewState.editingTeacherId = teacherId;
    renderMainViewGrid(data);
}

/**
 * Save the current teacher edit (rename)
 */
function saveTeacherEdit() {
    const teacherId = MainViewState.editingTeacherId;
    if (!teacherId) return;

    const input = document.querySelector('.teacher-edit-input');
    if (!input) return;

    const newName = input.value.trim();
    const data = loadData();
    if (!data) return;

    const error = validateTeacherName(newName);
    if (error) {
        alert(error);
        input.focus();
        return;
    }

    renameTeacher(data, teacherId, newName);
    saveData(data);
    MainViewState.editingTeacherId = null;
    renderMainViewGrid(data);
}

/**
 * Cancel the current teacher edit
 */
function cancelTeacherEdit() {
    const data = loadData();
    if (!data) return;
    MainViewState.editingTeacherId = null;
    renderMainViewGrid(data);
}

/**
 * Handle teacher deletion from edit mode
 * @param {string} teacherId - Teacher ID to delete
 */
function handleTeacherDelete(teacherId) {
    const data = loadData();
    const teacher = data.teachers[teacherId];
    const name = teacher ? teacher.name : 'this teacher';

    if (!confirm(`Delete teacher ${name}? This will also remove all associated data in this row. This cannot be undone.`)) {
        return; // Stay in edit mode
    }

    deleteTeacher(data, teacherId);
    saveData(data);
    MainViewState.editingTeacherId = null;

    // Re-render or show empty state
    initMainViewPage();
}

/**
 * Handle adding a new teacher after the current one
 * @param {string} afterTeacherId - Teacher ID to insert after
 */
function handleTeacherAdd(afterTeacherId) {
    // If currently editing, try to save first
    if (MainViewState.editingTeacherId) {
        const input = document.querySelector('.teacher-edit-input');
        if (input) {
            const newName = input.value.trim();
            const data = loadData();
            const error = validateTeacherName(newName);
            if (!error) {
                renameTeacher(data, MainViewState.editingTeacherId, newName);
                saveData(data);
            }
        }
    }

    const data = loadData();
    const result = addTeacherAfter(data, afterTeacherId, 'New Teacher');
    if (!result.success) return;
    saveData(data);
    MainViewState.editingTeacherId = result.newTeacherId;
    renderMainViewGrid(data);
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
        MainViewState.debouncedSave(data);

        // Update conflict highlighting immediately for responsive feedback
        updateConflictHighlighting(data);
    } else {
        console.error('Slot not found:', slotId);
    }
}

/**
 * Show conflict tooltip near the hovered cell
 * @param {HTMLElement} cell - The cell element with conflicts
 * @param {MouseEvent} event - The mouse event
 */
function showConflictTooltip(cell, event) {
    // Remove any existing tooltip
    hideConflictTooltip();

    const conflictsData = cell.dataset.conflicts;
    if (!conflictsData) return;

    let conflicts;
    try {
        conflicts = JSON.parse(conflictsData);
    } catch (e) {
        return;
    }

    if (!conflicts || conflicts.length === 0) return;

    // Build tooltip content
    const tooltip = document.createElement('div');
    tooltip.className = 'conflict-tooltip';
    tooltip.id = 'conflict-tooltip';

    for (const conflict of conflicts) {
        const item = document.createElement('div');
        item.className = 'conflict-tooltip-item';

        const typeLabel = conflict.type === 'studentGroup' ? 'Class' : 'Room';
        const otherTeachers = conflict.otherTeachers.join(', ');

        item.innerHTML = `<span class="conflict-tooltip-type">${escapeHtml(typeLabel)}:</span> ${escapeHtml(conflict.entityName)} is also scheduled with ${escapeHtml(otherTeachers)}`;
        tooltip.appendChild(item);
    }

    document.body.appendChild(tooltip);

    // Position tooltip near the mouse but ensure it stays on screen
    const rect = cell.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let left = rect.right + 10;
    let top = rect.top;

    // Keep tooltip on screen
    if (left + tooltipRect.width > window.innerWidth) {
        left = rect.left - tooltipRect.width - 10;
    }
    if (top + tooltipRect.height > window.innerHeight) {
        top = window.innerHeight - tooltipRect.height - 10;
    }
    if (top < 0) {
        top = 10;
    }

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
}

/**
 * Hide the conflict tooltip
 */
function hideConflictTooltip() {
    const existing = document.getElementById('conflict-tooltip');
    if (existing) {
        existing.remove();
    }
}

/**
 * Update conflict highlighting after a dropdown change
 * Re-detects conflicts and updates the visual state
 * @param {Object} data - TimetableData object
 */
function updateConflictHighlighting(data) {
    // Hide any visible tooltip — it may be stale after conflict state changes
    hideConflictTooltip();

    // Re-detect conflicts
    MainViewState.conflictMap = detectConflicts(data);

    // Update all data cells
    const cells = $$('.grid-data-cell');
    for (const cell of cells) {
        const day = cell.dataset.day;
        const period = parseInt(cell.dataset.period, 10);
        const teacherId = cell.dataset.teacherId;

        // Find the slot for this cell
        const slot = data.slots.find(s =>
            s.day === day &&
            s.period === period &&
            s.teacherId === teacherId
        );

        if (slot) {
            const conflicts = MainViewState.conflictMap[slot.id] || [];

            // Update cell conflict state
            if (conflicts.length > 0) {
                cell.classList.add('cell-conflict');
                cell.dataset.conflicts = JSON.stringify(conflicts);
            } else {
                cell.classList.remove('cell-conflict');
                delete cell.dataset.conflicts;
            }

            // Update dropdown conflict highlighting
            const dropdowns = cell.querySelectorAll('.cell-dropdown');
            const conflictTypes = new Set(conflicts.map(c => c.type));

            for (const dropdown of dropdowns) {
                const field = dropdown.dataset.field;
                const type = FIELD_CONFLICT_TYPE_MAP[field] ?? null;

                if (type && conflictTypes.has(type)) {
                    dropdown.classList.add('dropdown-conflict');
                } else {
                    dropdown.classList.remove('dropdown-conflict');
                }
            }
        }
    }
}

/**
 * Enter period label edit mode
 * @param {number} periodId - Integer period ID
 */
function enterPeriodEditMode(periodId) {
    const data = loadData();
    if (!data) return;
    MainViewState.editingPeriodId = periodId;
    renderMainViewGrid(data);
}

/**
 * Save the current period name edit
 */
function savePeriodEdit() {
    const periodId = MainViewState.editingPeriodId;
    if (!periodId) return;
    const input = document.querySelector('.period-edit-input');
    if (!input) return;
    const newName = input.value.trim();
    const data = loadData();
    if (!data) return;
    const result = renamePeriod(data, periodId, newName);
    if (!result.success) { alert(result.error); input.focus(); return; }
    saveData(data);
    MainViewState.editingPeriodId = null;
    renderMainViewGrid(data);
}

/**
 * Cancel the current period name edit
 */
function cancelPeriodEdit() {
    const data = loadData();
    if (!data) return;
    MainViewState.editingPeriodId = null;
    renderMainViewGrid(data);
}

/**
 * Set up event listeners for Timetable Builder (formerly Main View)
 */
function setupMainViewEventListeners() {
    const emptyStateLink = $('#empty-state-link');
    const grid = $('#timetable-grid');

    if (emptyStateLink) {
        emptyStateLink.addEventListener('click', (e) => {
            e.preventDefault();
            showPage('setup');
        });
    }

    // Event delegation for dropdown changes
    if (grid) {
        grid.addEventListener('change', handleDropdownChange);

        // Keydown on edit inputs: Enter saves, Escape cancels
        grid.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('teacher-edit-input')) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    saveTeacherEdit();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelTeacherEdit();
                }
            } else if (e.target.classList.contains('period-edit-input')) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    savePeriodEdit();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelPeriodEdit();
                }
            }
        });

        // Event delegation for defaults panel toggle buttons and teacher edit buttons
        grid.addEventListener('click', (e) => {
            const toggleBtn = e.target.closest('.defaults-toggle');
            if (toggleBtn) {
                const teacherId = toggleBtn.dataset.teacherId;
                toggleDefaultsPanel(teacherId);
            }

            const applyBtn = e.target.closest('.defaults-apply-btn');
            if (applyBtn) {
                const teacherId = applyBtn.dataset.teacherId;
                applyTeacherDefaults(teacherId);
            }

            // Teacher edit: trash button
            const trashBtn = e.target.closest('.teacher-edit-trash');
            if (trashBtn) {
                const teacherId = MainViewState.editingTeacherId;
                if (teacherId) handleTeacherDelete(teacherId);
            }

            // Teacher edit: add button
            const addBtn = e.target.closest('.teacher-edit-add');
            if (addBtn) {
                const teacherId = MainViewState.editingTeacherId;
                if (teacherId) handleTeacherAdd(teacherId);
            }

            // Single-click on teacher name to enter edit mode
            const editableHeader = e.target.closest('.teacher-header-editable');
            if (editableHeader && !e.target.closest('.defaults-toggle')) {
                const teacherId = editableHeader.dataset.teacherId;
                if (!teacherId) return;
                const panel = document.getElementById(`defaults-panel-${teacherId}`);
                if (panel && panel.classList.contains('expanded')) return;
                enterTeacherEditMode(teacherId);
            }

            // Single-click on period label to enter edit mode
            const periodLabel = e.target.closest('.period-label-editable');
            if (periodLabel) {
                enterPeriodEditMode(parseInt(periodLabel.dataset.periodId, 10));
            }
        });

        // Conflict tooltip event delegation
        grid.addEventListener('mouseenter', (e) => {
            const cell = e.target.closest('.cell-conflict');
            if (cell) {
                showConflictTooltip(cell, e);
            }
        }, true);

        grid.addEventListener('mouseleave', (e) => {
            const cell = e.target.closest('.cell-conflict');
            if (cell) {
                hideConflictTooltip();
            }
        }, true);
    }
}

// Export for Node.js testing (ignored in browser)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getSlotForCell,
        createDropdown,
        MainViewState
    };
}
