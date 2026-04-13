/**
 * Schedulae - Data Entry Page Module
 */

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

        // Populate periods
        $('#periods-input').value = data.periods.length;

        // Populate all entity textareas
        $('#teachers-input').value       = entitiesToText(data.teachers);
        $('#student-groups-input').value = entitiesToText(data.studentGroups);
        $('#rooms-input').value          = entitiesToText(data.rooms);
        $('#subjects-input').value       = entitiesToText(data.subjects);
    } else {
        // Show first-time setup, hide editing section
        firstTimeSetup.classList.remove('page-hidden');
        editingSection.classList.add('page-hidden');

        // Reset initial periods input
        const initialPeriodsInput = $('#initial-periods');
        if (initialPeriodsInput) {
            initialPeriodsInput.value = 6;
        }
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
 * Build a removal confirmation message if deleted entities have slot references.
 * @param {string[]} deletedIds - IDs being removed
 * @param {Object} previousEntities - Entity map before the save (to look up names)
 * @param {string} entityType - e.g. 'rooms'
 * @param {Object[]} slots - Current slot array
 * @returns {string|null} Confirmation message, or null if no confirmation needed
 */
function buildRemovalWarning(deletedIds, previousEntities, entityType, slots) {
    if (deletedIds.length === 0) return null;

    const affected = [];
    for (const id of deletedIds) {
        const count = countSlotsReferencingEntity(entityType, id, slots);
        if (count > 0) {
            const name = previousEntities[id]?.name ?? id;
            affected.push({ name, count });
        }
    }

    if (affected.length === 0) return null;

    const totalSlots = affected.reduce((sum, a) => sum + a.count, 0);
    const itemList = affected.map(a => `"${a.name}" (${a.count} slot${a.count !== 1 ? 's' : ''})`).join(', ');
    return `Removing ${itemList} will clear ${totalSlots} slot reference${totalSlots !== 1 ? 's' : ''}. Continue?`;
}

/**
 * Show an error message for a specific field
 * @param {string} fieldId - Base ID of the field (without -error suffix)
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
        }, SAVE_CONFIRM_DISPLAY_MS);
    }
}

/**
 * Handle Save Teachers button click
 */
function handleSaveTeachers() {
    const teachersText = $('#teachers-input').value;
    const names = parseTextareaToNames(teachersText);

    const errors = validateEntityNames(names);
    if (errors.length > 0) {
        showFieldError('teachers', errors[0]);
        return;
    }

    let data = loadData();
    if (!data) return;

    const teacherSync = syncEntities(data.teachers, names, 'teachers', data);

    const warning = buildRemovalWarning(teacherSync.deletedIds, data.teachers, 'teachers', data.slots);
    if (warning && !confirm(warning)) return;

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
        showFieldError('teachers', '');
        showSaveConfirmation('save-teachers-btn');
    }
}

/**
 * Handle Save Student Groups button click
 */
function handleSaveStudentGroups() {
    const names = parseTextareaToNames($('#student-groups-input').value);
    const errors = validateEntityNames(names);
    if (errors.length > 0) { showFieldError('student-groups', errors[0]); return; }

    let data = loadData();
    if (!data) return;

    const sync = syncEntities(data.studentGroups, names, 'studentGroups', data);

    const warning = buildRemovalWarning(sync.deletedIds, data.studentGroups, 'studentGroups', data.slots);
    if (warning && !confirm(warning)) return;

    if (sync.deletedIds.length > 0) {
        data.slots = orphanSlotReferences(data.slots, ENTITY_FIELD_MAP['studentGroups'], sync.deletedIds);
    }
    data.studentGroups = sync.entities;

    if (saveData(data)) {
        showFieldError('student-groups', '');
        showSaveConfirmation('save-student-groups-btn');
    }
}

/**
 * Handle Save Rooms button click
 */
function handleSaveRooms() {
    const names = parseTextareaToNames($('#rooms-input').value);
    const errors = validateEntityNames(names);
    if (errors.length > 0) { showFieldError('rooms', errors[0]); return; }

    let data = loadData();
    if (!data) return;

    const sync = syncEntities(data.rooms, names, 'rooms', data);

    const warning = buildRemovalWarning(sync.deletedIds, data.rooms, 'rooms', data.slots);
    if (warning && !confirm(warning)) return;

    if (sync.deletedIds.length > 0) {
        data.slots = orphanSlotReferences(data.slots, ENTITY_FIELD_MAP['rooms'], sync.deletedIds);
    }
    data.rooms = sync.entities;

    if (saveData(data)) {
        showFieldError('rooms', '');
        showSaveConfirmation('save-rooms-btn');
    }
}

/**
 * Handle Save Subjects button click
 */
function handleSaveSubjects() {
    const names = parseTextareaToNames($('#subjects-input').value);
    const errors = validateEntityNames(names);
    if (errors.length > 0) { showFieldError('subjects', errors[0]); return; }

    let data = loadData();
    if (!data) return;

    const sync = syncEntities(data.subjects, names, 'subjects', data);

    const warning = buildRemovalWarning(sync.deletedIds, data.subjects, 'subjects', data.slots);
    if (warning && !confirm(warning)) return;

    if (sync.deletedIds.length > 0) {
        data.slots = orphanSlotReferences(data.slots, ENTITY_FIELD_MAP['subjects'], sync.deletedIds);
    }
    data.subjects = sync.entities;

    if (saveData(data)) {
        showFieldError('subjects', '');
        showSaveConfirmation('save-subjects-btn');
    }
}

/**
 * Handle Save Periods button click
 */
function handleSavePeriods() {
    const periodsValue = $('#periods-input').value;
    const newCount = parseInt(periodsValue, 10);

    const periodsError = validatePeriods(periodsValue);
    if (periodsError) {
        showFieldError('periods', periodsError);
        return;
    }

    let data = loadData();
    if (!data) return;

    if (handlePeriodChange(data, newCount)) {
        if (saveData(data)) {
            showFieldError('periods', '');
            showSaveConfirmation('save-periods-btn');
        }
    }
}

/**
 * Handle Create Timetable button click
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
        initDataEntryPage();
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
 * Set up event listeners for the Setup page
 */
function setupDataEntryEventListeners() {
    const saveFileButton = $('#save-file-button');
    const loadFileButton = $('#load-file-button');
    const fileInput = $('#file-input');
    const createTimetableBtn = $('#create-timetable-btn');
    const savePeriodsBtn = $('#save-periods-btn');
    const saveTeachersBtn = $('#save-teachers-btn');
    const saveStudentGroupsBtn = $('#save-student-groups-btn');
    const saveRoomsBtn = $('#save-rooms-btn');
    const saveSubjectsBtn = $('#save-subjects-btn');

    if (createTimetableBtn) {
        createTimetableBtn.addEventListener('click', handleCreateTimetable);
    }

    if (savePeriodsBtn) {
        savePeriodsBtn.addEventListener('click', handleSavePeriods);
    }

    if (saveTeachersBtn) {
        saveTeachersBtn.addEventListener('click', handleSaveTeachers);
    }

    if (saveStudentGroupsBtn) {
        saveStudentGroupsBtn.addEventListener('click', handleSaveStudentGroups);
    }

    if (saveRoomsBtn) {
        saveRoomsBtn.addEventListener('click', handleSaveRooms);
    }

    if (saveSubjectsBtn) {
        saveSubjectsBtn.addEventListener('click', handleSaveSubjects);
    }

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
 */
function handleSaveToFile() {
    if (exportToFile()) {
        showFileStatus('Timetable downloaded successfully', false);
    }
}

/**
 * Handle Load from File button click
 */
function handleLoadFromFile() {
    const fileInput = $('#file-input');
    if (fileInput) {
        fileInput.value = '';
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

        if (hasExistingData()) {
            if (!confirm('Importing this file will replace your current timetable. All existing data will be lost. Continue?')) {
                return;
            }
        }

        const result = importFromFile(text);

        if (result.success) {
            showFileStatus('Timetable imported successfully', false);
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

        setTimeout(() => {
            if (statusEl.textContent === message) {
                statusEl.textContent = '';
                statusEl.className = 'file-status';
            }
        }, FILE_STATUS_DISPLAY_MS);
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
        entitiesToText,
        buildRemovalWarning,
        handleSaveTeachers,
        handleSaveStudentGroups,
        handleSaveRooms,
        handleSaveSubjects,
    };
}
