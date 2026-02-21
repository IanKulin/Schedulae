/**
 * Schedulae - Data Entry Page Module
 */

// Module-level state for entity editing
const entityState = {
    studentGroups: { entities: {}, pendingDeletes: [] },
    rooms: { entities: {}, pendingDeletes: [] },
    subjects: { entities: {}, pendingDeletes: [] }
};

// Track which entity list has an active edit/add
let activeEditState = null; // { entityType, entityId } or { entityType, isAdding: true }

// Reference to loaded slots for counting references
let loadedSlots = [];

const ENTITY_CONFIG = {
    studentGroups: { containerId: 'student-groups-list', errorFieldId: 'student-groups' },
    rooms:         { containerId: 'rooms-list',           errorFieldId: 'rooms' },
    subjects:      { containerId: 'subjects-list',        errorFieldId: 'subjects' },
};

/**
 * Initialize the Setup page (formerly Data Entry)
 * Shows first-time setup or editing mode based on whether data exists
 */
function initDataEntryPage() {
    const data = loadData();
    const dataExists = data !== null;

    // Get section elements
    const firstTimeSetup = $('#first-time-setup');
    const editingSection = $('#editing-section');

    // Clear any existing error messages
    clearFieldErrors();
    clearFileStatus();

    if (dataExists) {
        // Show editing section, hide first-time setup
        firstTimeSetup.classList.add('page-hidden');
        editingSection.classList.remove('page-hidden');

        // Get form elements
        const periodsInput = $('#periods-input');
        const teachersInput = $('#teachers-input');

        // Populate periods
        periodsInput.value = data.periods.length;

        // Populate teachers (still uses textarea)
        teachersInput.value = entitiesToText(data.teachers);

        // Initialize entity state from loaded data
        entityState.studentGroups = { entities: { ...data.studentGroups }, pendingDeletes: [] };
        entityState.rooms = { entities: { ...data.rooms }, pendingDeletes: [] };
        entityState.subjects = { entities: { ...data.subjects }, pendingDeletes: [] };

        // Store slots for reference counting
        loadedSlots = data.slots || [];

        // Render entity lists
        renderEntityList('student-groups-list', 'studentGroups');
        renderEntityList('rooms-list', 'rooms');
        renderEntityList('subjects-list', 'subjects');
    } else {
        // Show first-time setup, hide editing section
        firstTimeSetup.classList.remove('page-hidden');
        editingSection.classList.add('page-hidden');

        // Reset initial periods input
        const initialPeriodsInput = $('#initial-periods');
        if (initialPeriodsInput) {
            initialPeriodsInput.value = 6;
        }

        // Initialize empty entity state
        entityState.studentGroups = { entities: {}, pendingDeletes: [] };
        entityState.rooms = { entities: {}, pendingDeletes: [] };
        entityState.subjects = { entities: {}, pendingDeletes: [] };
        loadedSlots = [];
    }

    // Reset active edit state
    activeEditState = null;
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
 * Render an entity list in its container
 * @param {string} containerId - ID of the container element
 * @param {string} entityType - Entity type key ('studentGroups', 'rooms', 'subjects')
 */
function renderEntityList(containerId, entityType) {
    const container = $(`#${containerId}`);
    if (!container) return;

    const state = entityState[entityType];
    const entities = state.entities;
    const sortedIds = Object.keys(entities).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    // Check if there's an active add for this type
    const isAddingToThis = activeEditState &&
                           activeEditState.entityType === entityType &&
                           activeEditState.isAdding;

    // Check if any edit is active (to disable add button)
    const hasActiveEdit = activeEditState !== null;

    let html = '';

    if (sortedIds.length === 0 && !isAddingToThis) {
        html += '<div class="entity-empty">No items added yet</div>';
    } else {
        html += '<ul class="entity-editor-items">';

        for (const id of sortedIds) {
            const entity = entities[id];
            const isEditing = activeEditState &&
                              activeEditState.entityType === entityType &&
                              activeEditState.entityId === id;

            if (isEditing) {
                html += renderEditRow(entityType, id, entity.name);
            } else {
                html += renderDisplayRow(entityType, id, entity.name, hasActiveEdit);
            }
        }

        // Add row if adding to this list
        if (isAddingToThis) {
            html += renderAddRow(entityType);
        }

        html += '</ul>';
    }

    // Add button (show add row inline when clicked, or show empty state with add row)
    if (isAddingToThis && sortedIds.length === 0) {
        html = '<ul class="entity-editor-items">' + renderAddRow(entityType) + '</ul>';
    }

    const addDisabled = hasActiveEdit ? 'disabled' : '';
    html += `<button type="button" class="add-entity-btn" data-entity-type="${entityType}" ${addDisabled}>+ Add</button>`;

    container.innerHTML = html;

    // Focus input if in edit/add mode
    if (activeEditState && activeEditState.entityType === entityType) {
        const input = container.querySelector('.entity-edit-input');
        if (input) {
            input.focus();
            input.select();
        }
    }
}

/**
 * Render a display row for an entity
 */
function renderDisplayRow(entityType, id, name, hasActiveEdit) {
    const escapedName = escapeHtml(name);
    const disabled = hasActiveEdit ? 'disabled' : '';

    return `
        <li class="entity-item" data-entity-id="${id}">
            <span class="entity-name">${escapedName}</span>
            <div class="entity-actions">
                <button type="button" class="btn-icon btn-icon--edit"
                        data-action="edit" data-entity-type="${entityType}" data-entity-id="${id}"
                        ${disabled}>Edit</button>
                <button type="button" class="btn-icon btn-icon--delete"
                        data-action="delete" data-entity-type="${entityType}" data-entity-id="${id}"
                        ${disabled}>Delete</button>
            </div>
        </li>
    `;
}

/**
 * Render an edit row for an entity
 */
function renderEditRow(entityType, id, currentName) {
    const escapedName = escapeHtml(currentName);

    return `
        <li class="entity-item entity-item--editing" data-entity-id="${id}">
            <input type="text" class="entity-edit-input" value="${escapedName}"
                   data-entity-type="${entityType}" data-entity-id="${id}">
            <div class="entity-edit-actions">
                <button type="button" class="btn-edit-save"
                        data-action="save-edit" data-entity-type="${entityType}" data-entity-id="${id}">Save</button>
                <button type="button" class="btn-edit-cancel"
                        data-action="cancel-edit" data-entity-type="${entityType}">Cancel</button>
            </div>
        </li>
    `;
}

/**
 * Render an add row for new entity
 */
function renderAddRow(entityType) {
    return `
        <li class="entity-item entity-item--editing">
            <input type="text" class="entity-edit-input" value=""
                   data-entity-type="${entityType}" data-is-add="true" placeholder="Enter name...">
            <div class="entity-edit-actions">
                <button type="button" class="btn-edit-save"
                        data-action="save-add" data-entity-type="${entityType}">Save</button>
                <button type="button" class="btn-edit-cancel"
                        data-action="cancel-add" data-entity-type="${entityType}">Cancel</button>
            </div>
        </li>
    `;
}

/**
 * Handle clicks within entity editors
 */
function handleEntityEditorClick(event) {
    const target = event.target;
    const action = target.dataset.action;
    const entityType = target.dataset.entityType;

    if (!action) {
        // Check if it's an add button
        if (target.classList.contains('add-entity-btn')) {
            const type = target.dataset.entityType;
            if (type && !activeEditState) {
                enterAddMode(type);
            }
        }
        return;
    }

    switch (action) {
        case 'edit':
            enterEditMode(entityType, target.dataset.entityId);
            break;
        case 'delete':
            handleDelete(entityType, target.dataset.entityId);
            break;
        case 'save-edit':
            saveEdit(entityType, target.dataset.entityId);
            break;
        case 'cancel-edit':
            cancelEdit(entityType);
            break;
        case 'save-add':
            saveAdd(entityType);
            break;
        case 'cancel-add':
            cancelAdd(entityType);
            break;
    }
}

/**
 * Handle keydown events in entity edit inputs
 */
function handleEntityEditorKeydown(event) {
    if (!event.target.classList.contains('entity-edit-input')) return;

    const entityType = event.target.dataset.entityType;
    const entityId = event.target.dataset.entityId;
    const isAdd = event.target.dataset.isAdd === 'true';

    if (event.key === 'Enter') {
        event.preventDefault();
        if (isAdd) {
            saveAdd(entityType);
        } else {
            saveEdit(entityType, entityId);
        }
    } else if (event.key === 'Escape') {
        event.preventDefault();
        if (isAdd) {
            cancelAdd(entityType);
        } else {
            cancelEdit(entityType);
        }
    }
}

/**
 * Enter edit mode for an entity
 */
function enterEditMode(entityType, entityId) {
    if (activeEditState) return; // Already editing

    activeEditState = { entityType, entityId };
    renderAllEntityLists();
}

/**
 * Enter add mode for an entity type
 */
function enterAddMode(entityType) {
    if (activeEditState) return; // Already editing

    activeEditState = { entityType, isAdding: true };
    renderAllEntityLists();
}

/**
 * Save current entity state to LocalStorage
 * @returns {boolean} True if save succeeded
 */
function saveCurrentState() {
    let data = loadData();
    if (!data) return false;

    // Apply current entity state
    data.studentGroups = { ...entityState.studentGroups.entities };
    data.rooms = { ...entityState.rooms.entities };
    data.subjects = { ...entityState.subjects.entities };

    return saveData(data);
}

/**
 * Save an edit operation (with immediate persistence)
 */
function saveEdit(entityType, entityId) {
    const container = getContainerForType(entityType);
    const input = container.querySelector('.entity-edit-input');
    if (!input) return;

    const newName = input.value.trim();

    // Validate
    const error = validateSingleEntityName(entityType, newName, entityId);
    if (error) {
        showFieldError(getErrorFieldId(entityType), error);
        input.focus();
        return;
    }

    // Clear any previous error
    showFieldError(getErrorFieldId(entityType), '');

    // Update entity name
    entityState[entityType].entities[entityId] = { id: entityId, name: newName };

    // Save immediately to LocalStorage
    saveCurrentState();

    // Exit edit mode
    activeEditState = null;
    renderAllEntityLists();
}

/**
 * Cancel an edit operation
 */
function cancelEdit(entityType) {
    activeEditState = null;
    showFieldError(getErrorFieldId(entityType), '');
    renderAllEntityLists();
}

/**
 * Save an add operation (with immediate persistence)
 */
function saveAdd(entityType) {
    const container = getContainerForType(entityType);
    const input = container.querySelector('.entity-edit-input');
    if (!input) return;

    const newName = input.value.trim();

    // Validate
    const error = validateSingleEntityName(entityType, newName, null);
    if (error) {
        showFieldError(getErrorFieldId(entityType), error);
        input.focus();
        return;
    }

    // Clear any previous error
    showFieldError(getErrorFieldId(entityType), '');

    // Generate new ID and add entity
    const newId = generateEntityId(entityType, { [entityType]: entityState[entityType].entities });
    entityState[entityType].entities[newId] = { id: newId, name: newName };

    // Save immediately to LocalStorage
    saveCurrentState();

    // Exit add mode
    activeEditState = null;
    renderAllEntityLists();
}

/**
 * Cancel an add operation
 */
function cancelAdd(entityType) {
    activeEditState = null;
    showFieldError(getErrorFieldId(entityType), '');
    renderAllEntityLists();
}

/**
 * Handle delete of an entity (with immediate persistence)
 */
function handleDelete(entityType, entityId) {
    const entity = entityState[entityType].entities[entityId];
    if (!entity) return;

    // Count slot references
    const slotCount = countSlotsReferencingEntity(entityType, entityId, loadedSlots);

    // Build confirmation message
    let message = `Delete '${entity.name}'?`;
    if (slotCount > 0) {
        message = `Delete '${entity.name}'? This will remove it from ${slotCount} slot${slotCount !== 1 ? 's' : ''}.`;
    }

    if (!confirm(message)) {
        return;
    }

    // Remove from entities
    delete entityState[entityType].entities[entityId];

    // Apply orphaning and save immediately
    let data = loadData();
    if (data) {
        data.slots = orphanSlotReferences(data.slots, ENTITY_FIELD_MAP[entityType], [entityId]);
        data[entityType] = { ...entityState[entityType].entities };
        saveData(data);

        // Update loaded slots reference
        loadedSlots = data.slots;
    }

    // Clear pending deletes (no longer needed with immediate saves)
    entityState[entityType].pendingDeletes = [];

    renderAllEntityLists();
}

/**
 * Validate a single entity name
 * @returns {string|null} Error message or null if valid
 */
function validateSingleEntityName(entityType, name, excludeId) {
    if (!name || name.length === 0) {
        return 'Name cannot be blank';
    }

    if (hasInvalidCharacters(name)) {
        return 'Name contains invalid characters';
    }

    // Check for duplicates
    const entities = entityState[entityType].entities;
    for (const [id, entity] of Object.entries(entities)) {
        if (id !== excludeId && entity.name === name) {
            return `Duplicate name: "${name}"`;
        }
    }

    return null;
}

/**
 * Get container element for an entity type
 */
function getContainerForType(entityType) {
    return $(`#${ENTITY_CONFIG[entityType].containerId}`);
}

/**
 * Get error field ID for an entity type
 */
function getErrorFieldId(entityType) {
    return ENTITY_CONFIG[entityType].errorFieldId;
}

/**
 * Render all entity lists
 */
function renderAllEntityLists() {
    renderEntityList('student-groups-list', 'studentGroups');
    renderEntityList('rooms-list', 'rooms');
    renderEntityList('subjects-list', 'subjects');
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
 * Show visual feedback when a save succeeds
 * @param {string} buttonId - ID of the button (without # prefix)
 */
function showSaveConfirmation(buttonId) {
    const btn = $(`#${buttonId}`);
    if (btn) {
        const originalText = btn.textContent;
        btn.textContent = 'Saved ✓';
        btn.classList.add('save-success');
        setTimeout(() => {
            btn.textContent = originalText;
            btn.classList.remove('save-success');
        }, 1500);
    }
}

/**
 * Handle Save Teachers button click
 * Saves teachers from textarea to LocalStorage immediately
 */
function handleSaveTeachers() {
    const teachersText = $('#teachers-input').value;
    const names = parseTextareaToNames(teachersText);

    // Validate
    const errors = validateEntityNames(names);
    if (errors.length > 0) {
        showFieldError('teachers', errors[0]);
        return;
    }

    let data = loadData();
    if (!data) return;

    // Sync teachers (existing logic)
    const teacherSync = syncEntities(data.teachers, names, 'teachers', data);

    // Handle deleted teachers - remove their slots
    if (teacherSync.deletedIds.length > 0) {
        const deletedSet = new Set(teacherSync.deletedIds);
        data.slots = data.slots.filter(slot => !deletedSet.has(slot.teacherId));
    }

    // Create slots for new teachers
    const newTeacherIds = Object.keys(teacherSync.entities).filter(id => !data.teachers[id]);
    for (const teacherId of newTeacherIds) {
        const newSlots = createSlotsForTeacher(teacherId, data.periods.map(p => p.id));
        data.slots.push(...newSlots);
    }

    data.teachers = teacherSync.entities;

    if (saveData(data)) {
        showFieldError('teachers', ''); // Clear any error
        showSaveConfirmation('save-teachers-btn');
        // Update loaded slots reference
        loadedSlots = data.slots;
    }
}

/**
 * Handle Save Periods button click
 * Saves period count to LocalStorage immediately
 */
function handleSavePeriods() {
    const periodsValue = $('#periods-input').value;
    const newCount = parseInt(periodsValue, 10);

    // Validate
    const periodsError = validatePeriods(periodsValue);
    if (periodsError) {
        showFieldError('periods', periodsError);
        return;
    }

    let data = loadData();
    if (!data) return;

    // Use existing period change logic (includes confirmation for reduction)
    if (handlePeriodChange(data, newCount)) {
        if (saveData(data)) {
            showFieldError('periods', '');
            showSaveConfirmation('save-periods-btn');
            // Update loaded slots reference
            loadedSlots = data.slots;
        }
    }
}

/**
 * Handle Create Timetable button click
 * Creates initial timetable data structure
 */
function handleCreateTimetable() {
    const periodsValue = $('#initial-periods').value;
    const periodCount = parseInt(periodsValue, 10);

    if (isNaN(periodCount) || periodCount < 1 || periodCount > 12) {
        showFieldError('initial-periods', 'Periods must be between 1 and 12');
        return;
    }

    const data = createEmptyTimetableData(periodCount);
    if (saveData(data)) {
        initDataEntryPage(); // Reinitialize to show editing mode
    }
}


/**
 * Handle changes to period count with user confirmation for reduction
 * @param {Object} data - TimetableData object
 * @param {number} newCount - New period count
 * @returns {boolean} True if change was applied, false if cancelled
 */
function handlePeriodChange(data, newCount) {
    const currentCount = data.periods.length;

    if (newCount > currentCount) {
        addPeriodsToTimetable(data, newCount);
        return true;
    } else if (newCount < currentCount) {
        const affectedSlots = countSlotsForPeriods(data, newCount);
        const periodsToRemove = currentCount - newCount;
        const removedNames = data.periods
            .filter(p => p.id > newCount)
            .map(p => p.name)
            .join(', ');

        const message = `Reducing periods from ${currentCount} to ${newCount} will permanently delete all data for: ${removedNames}. This will affect ${affectedSlots} slot${affectedSlots !== 1 ? 's' : ''}. Are you sure?`;

        if (!confirm(message)) {
            return false;
        }

        removePeriodsFromTimetable(data, newCount);
    }
    return true;
}


/**
 * Set up event listeners for the Setup page (formerly Data Entry)
 */
function setupDataEntryEventListeners() {
    const form = $('#data-entry-form');
    const saveFileButton = $('#save-file-button');
    const loadFileButton = $('#load-file-button');
    const fileInput = $('#file-input');
    const createTimetableBtn = $('#create-timetable-btn');
    const savePeriodsBtn = $('#save-periods-btn');
    const saveTeachersBtn = $('#save-teachers-btn');

    if (form) {
        // Add delegated event listeners for entity editor clicks and keydowns
        form.addEventListener('click', handleEntityEditorClick);
        form.addEventListener('keydown', handleEntityEditorKeydown);
    }

    // First-time setup
    if (createTimetableBtn) {
        createTimetableBtn.addEventListener('click', handleCreateTimetable);
    }

    // Immediate save buttons
    if (savePeriodsBtn) {
        savePeriodsBtn.addEventListener('click', handleSavePeriods);
    }

    if (saveTeachersBtn) {
        saveTeachersBtn.addEventListener('click', handleSaveTeachers);
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
 * Handle Download timetable button click
 * Exports current timetable data to a JSON file
 */
function handleSaveToFile() {
    if (exportToFile()) {
        showFileStatus('Timetable downloaded successfully', false);
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
            if (!confirm('Importing this file will replace your current timetable. All existing data will be lost. Continue?')) {
                return;
            }
        }

        // Import the file
        const result = importFromFile(text);

        if (result.success) {
            showFileStatus('Timetable imported successfully', false);
            // Reinitialize the page to show imported data
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

// Export for Node.js testing (ignored in browser)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        entitiesToText
    };
}
