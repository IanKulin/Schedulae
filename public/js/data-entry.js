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
        // Populate periods (field remains enabled to allow editing)
        periodsInput.value = data.periods.length;

        // Populate teachers (still uses textarea)
        teachersInput.value = entitiesToText(data.teachers);

        // Initialize entity state from loaded data
        entityState.studentGroups = { entities: { ...data.studentGroups }, pendingDeletes: [] };
        entityState.rooms = { entities: { ...data.rooms }, pendingDeletes: [] };
        entityState.subjects = { entities: { ...data.subjects }, pendingDeletes: [] };

        // Store slots for reference counting
        loadedSlots = data.slots || [];

        // Show cancel button and Main View link when data exists
        cancelButton.classList.remove('page-hidden');
        if (mainViewLink) mainViewLink.classList.remove('page-hidden');
    } else {
        // Reset form to defaults
        periodsInput.value = 6;
        periodsInput.disabled = false;
        teachersInput.value = '';

        // Initialize empty entity state
        entityState.studentGroups = { entities: {}, pendingDeletes: [] };
        entityState.rooms = { entities: {}, pendingDeletes: [] };
        entityState.subjects = { entities: {}, pendingDeletes: [] };
        loadedSlots = [];

        // Hide cancel button and Main View link for first-time users
        cancelButton.classList.add('page-hidden');
        if (mainViewLink) mainViewLink.classList.add('page-hidden');
    }

    // Reset active edit state
    activeEditState = null;

    // Render entity lists
    renderEntityList('student-groups-list', 'studentGroups');
    renderEntityList('rooms-list', 'rooms');
    renderEntityList('subjects-list', 'subjects');
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
 * Save an edit operation
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
 * Save an add operation
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
    const newId = generateNewEntityId(entityType);
    entityState[entityType].entities[newId] = { id: newId, name: newName };

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
 * Handle delete of an entity
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

    // Mark for deletion and remove from entities
    entityState[entityType].pendingDeletes.push(entityId);
    delete entityState[entityType].entities[entityId];

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
 * Generate a new entity ID for an entity type
 */
function generateNewEntityId(entityType) {
    const entities = entityState[entityType].entities;
    const existingIds = Object.keys(entities).map(id => parseInt(id, 10));

    if (existingIds.length === 0) {
        return "1";
    }

    const maxId = Math.max(...existingIds);
    return String(maxId + 1);
}

/**
 * Get container element for an entity type
 */
function getContainerForType(entityType) {
    const containerIds = {
        'studentGroups': 'student-groups-list',
        'rooms': 'rooms-list',
        'subjects': 'subjects-list'
    };
    return $(`#${containerIds[entityType]}`);
}

/**
 * Get error field ID for an entity type
 */
function getErrorFieldId(entityType) {
    const fieldIds = {
        'studentGroups': 'student-groups',
        'rooms': 'rooms',
        'subjects': 'subjects'
    };
    return fieldIds[entityType];
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
 * Handle cancel button click
 * Discards form changes and returns to Main View
 */
function handleCancel() {
    showPage('main-view');
}

/**
 * Collect and parse form field values
 * Now collects from entity state instead of textareas for studentGroups/rooms/subjects
 * @returns {Object} Form data with periods and entity name arrays
 */
function collectFormData() {
    return {
        periods: $('#periods-input').value,
        teachers: parseTextareaToNames($('#teachers-input').value),
        studentGroups: getEntityNamesFromState('studentGroups'),
        rooms: getEntityNamesFromState('rooms'),
        subjects: getEntityNamesFromState('subjects')
    };
}

/**
 * Get entity names array from entity state
 */
function getEntityNamesFromState(entityType) {
    const entities = entityState[entityType].entities;
    const sortedIds = Object.keys(entities).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    return sortedIds.map(id => entities[id].name);
}

/**
 * Display validation errors for each field
 * @param {Object} errors - Validation errors keyed by field name
 */
function displayValidationErrors(errors) {
    if (errors.periods) showFieldError('periods', errors.periods);
    if (errors.teachers) showFieldError('teachers', errors.teachers);
    if (errors.studentGroups) showFieldError('student-groups', errors.studentGroups);
    if (errors.rooms) showFieldError('rooms', errors.rooms);
    if (errors.subjects) showFieldError('subjects', errors.subjects);
}

/**
 * Sync all entity types and update slots accordingly
 * Modified to use entity state for studentGroups/rooms/subjects
 * @param {Object} data - TimetableData object
 * @param {Object} formData - Parsed form data
 * @returns {string[]} IDs of newly created teachers
 */
function syncAllEntities(data, formData) {
    // Sync teachers and track new ones (for slot creation) - still uses name matching
    const teacherSync = syncEntities(data.teachers, formData.teachers, 'teachers', data);
    const newTeacherIds = Object.keys(teacherSync.entities).filter(
        id => !data.teachers[id]
    );

    // For deleted teachers, remove their slots entirely (slots are uniquely tied to teachers)
    if (teacherSync.deletedIds.length > 0) {
        const deletedTeacherSet = new Set(teacherSync.deletedIds);
        data.slots = data.slots.filter(slot => !deletedTeacherSet.has(slot.teacherId));
    }
    data.teachers = teacherSync.entities;

    // For studentGroups, rooms, subjects - use entity state directly (preserves IDs)
    // Apply pending deletes by orphaning slot references
    data.slots = orphanSlotReferences(data.slots, 'studentGroupId', entityState.studentGroups.pendingDeletes);
    data.studentGroups = { ...entityState.studentGroups.entities };

    data.slots = orphanSlotReferences(data.slots, 'roomId', entityState.rooms.pendingDeletes);
    data.rooms = { ...entityState.rooms.entities };

    data.slots = orphanSlotReferences(data.slots, 'subjectId', entityState.subjects.pendingDeletes);
    data.subjects = { ...entityState.subjects.entities };

    return newTeacherIds;
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
        const periodNumbers = [];
        for (let p = newCount + 1; p <= currentCount; p++) {
            periodNumbers.push(p);
        }
        const periodList = periodNumbers.join(', ');

        const message = `Reducing periods from ${currentCount} to ${newCount} will permanently delete all data for period${periodsToRemove > 1 ? 's' : ''} ${periodList}. This will affect ${affectedSlots} slot${affectedSlots !== 1 ? 's' : ''}. Are you sure?`;

        if (!confirm(message)) {
            return false;
        }

        removePeriodsFromTimetable(data, newCount);
    }
    return true;
}

/**
 * Handle form submission
 * Validates inputs, updates entities, creates slots, saves to LocalStorage
 * @param {Event} event - Form submit event
 */
function handleFormSubmit(event) {
    event.preventDefault();

    // Exit any active edit mode first
    if (activeEditState) {
        // Try to save the current edit
        if (activeEditState.isAdding) {
            saveAdd(activeEditState.entityType);
        } else {
            saveEdit(activeEditState.entityType, activeEditState.entityId);
        }
        // If still in edit mode after save attempt, there was a validation error
        if (activeEditState) {
            return;
        }
    }

    clearFieldErrors();

    const formData = collectFormData();
    const errors = validateAllInputs(formData);

    if (hasValidationErrors(errors)) {
        displayValidationErrors(errors);
        return;
    }

    let data = loadData();
    const isFirstSave = data === null;

    if (isFirstSave) {
        data = createEmptyTimetableData(parseInt(formData.periods, 10));
    }

    const newTeacherIds = syncAllEntities(data, formData);

    // Create slots for new teachers
    for (const teacherId of newTeacherIds) {
        const newSlots = createSlotsForTeacher(teacherId, data.periods);
        data.slots.push(...newSlots);
    }

    // Handle period count changes
    const newPeriodCount = parseInt(formData.periods, 10);
    if (!handlePeriodChange(data, newPeriodCount)) {
        return; // User cancelled period reduction
    }

    if (saveData(data)) {
        showPage('main-view');
    } else {
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

        // Add delegated event listeners for entity editor clicks and keydowns
        form.addEventListener('click', handleEntityEditorClick);
        form.addEventListener('keydown', handleEntityEditorKeydown);
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

// Export for Node.js testing (ignored in browser)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        entitiesToText
    };
}
