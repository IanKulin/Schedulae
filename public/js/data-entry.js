/**
 * Schedulae - Data Entry Page Module
 */

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
        // Populate periods (field remains enabled to allow editing)
        periodsInput.value = data.periods.length;

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
 * Collect and parse form field values
 * @returns {Object} Form data with periods and entity name arrays
 */
function collectFormData() {
    return {
        periods: $('#periods-input').value,
        teachers: parseTextareaToNames($('#teachers-input').value),
        studentGroups: parseTextareaToNames($('#studentgroups-input').value),
        rooms: parseTextareaToNames($('#rooms-input').value),
        subjects: parseTextareaToNames($('#subjects-input').value)
    };
}

/**
 * Display validation errors for each field
 * @param {Object} errors - Validation errors keyed by field name
 */
function displayValidationErrors(errors) {
    if (errors.periods) showFieldError('periods', errors.periods);
    if (errors.teachers) showFieldError('teachers', errors.teachers);
    if (errors.studentGroups) showFieldError('studentgroups', errors.studentGroups);
    if (errors.rooms) showFieldError('rooms', errors.rooms);
    if (errors.subjects) showFieldError('subjects', errors.subjects);
}

/**
 * Sync all entity types and update slots accordingly
 * @param {Object} data - TimetableData object
 * @param {Object} formData - Parsed form data
 * @returns {string[]} IDs of newly created teachers
 */
function syncAllEntities(data, formData) {
    // Sync teachers and track new ones (for slot creation)
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
