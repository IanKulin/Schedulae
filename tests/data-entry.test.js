const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

// ── Browser globals needed by data-entry.js ──────────────────────────────────
global.SAVE_CONFIRM_DISPLAY_MS = 1500;
global.FILE_STATUS_DISPLAY_MS  = 3000;

// Minimal DOM helpers
const domStore = {};
global.$ = (sel) => domStore[sel];
global.$$ = () => [];

// Stub confirm – tests override per-case
global.confirm = () => true;

// Load dependencies in the same order the browser would
const {
    ENTITY_FIELD_MAP,
    createEmptyTimetableData,
    parseTextareaToNames,
    validateEntityNames,
    syncEntities,
    orphanSlotReferences,
    createSlotsForTeacher,
} = require('../public/js/data.js');

const { countSlotsReferencingEntity } = require('../public/js/data-ops.js');

// Inject these as globals so data-entry.js can use them
global.ENTITY_FIELD_MAP           = ENTITY_FIELD_MAP;
global.parseTextareaToNames       = parseTextareaToNames;
global.validateEntityNames        = validateEntityNames;
global.syncEntities               = syncEntities;
global.orphanSlotReferences       = orphanSlotReferences;
global.createSlotsForTeacher      = createSlotsForTeacher;
global.countSlotsReferencingEntity = countSlotsReferencingEntity;

// localStorage stub
let _stored = null;
global.localStorage = {
    getItem: () => _stored,
    setItem: (_, v) => { _stored = v; },
    removeItem: () => { _stored = null; },
};
global.loadData  = () => _stored ? JSON.parse(_stored) : null;
global.saveData  = (d) => { _stored = JSON.stringify(d); return true; };
global.hasExistingData = () => _stored !== null;
global.validatePeriods = () => null;
global.addPeriodsToTimetable    = () => {};
global.removePeriodsFromTimetable = () => {};
global.countSlotsForPeriods     = () => 0;
global.exportToFile             = () => true;
global.importFromFile           = () => ({ success: true });
global.escapeHtml               = (s) => s;

const {
    entitiesToText,
    buildRemovalWarning,
    handleSaveStudentGroups,
    handleSaveRooms,
    handleSaveSubjects,
    handleSaveTeachers,
} = require('../public/js/data-entry.js');

// ── entitiesToText ────────────────────────────────────────────────────────────

describe('entitiesToText', () => {
    it('should return empty string for null', () => {
        assert.strictEqual(entitiesToText(null), '');
    });

    it('should return empty string for undefined', () => {
        assert.strictEqual(entitiesToText(undefined), '');
    });

    it('should return empty string for empty object', () => {
        assert.strictEqual(entitiesToText({}), '');
    });

    it('should return just the name for a single entity', () => {
        const entities = { '1': { id: '1', name: 'Alice' } };
        assert.strictEqual(entitiesToText(entities), 'Alice');
    });

    it('should join multiple entity names with newlines', () => {
        const entities = {
            '1': { id: '1', name: 'Alice' },
            '2': { id: '2', name: 'Bob' },
            '3': { id: '3', name: 'Charlie' }
        };
        assert.strictEqual(entitiesToText(entities), 'Alice\nBob\nCharlie');
    });

    it('should sort by numeric ID, not lexicographic order', () => {
        const entities = {
            '10': { id: '10', name: 'Third' },
            '2':  { id: '2',  name: 'Second' },
            '1':  { id: '1',  name: 'First' }
        };
        assert.strictEqual(entitiesToText(entities), 'First\nSecond\nThird');
    });

    it('should handle non-sequential IDs with gaps', () => {
        const entities = {
            '5': { id: '5', name: 'Beta' },
            '1': { id: '1', name: 'Alpha' }
        };
        assert.strictEqual(entitiesToText(entities), 'Alpha\nBeta');
    });
});

// ── buildRemovalWarning ───────────────────────────────────────────────────────

describe('buildRemovalWarning', () => {
    const makeSlot = (roomId) => ({ roomId, studentGroupId: null, subjectId: null, teacherId: '1' });

    it('returns null when no IDs are deleted', () => {
        assert.strictEqual(buildRemovalWarning([], {}, 'rooms', []), null);
    });

    it('returns null when deleted entities have no slot references', () => {
        const entities = { '1': { id: '1', name: 'Room 101' } };
        const slots = [makeSlot('2')]; // slot references entity 2, not 1
        assert.strictEqual(buildRemovalWarning(['1'], entities, 'rooms', slots), null);
    });

    it('returns a message when a deleted entity has slot references', () => {
        const entities = { '1': { id: '1', name: 'Room 101' } };
        const slots = [makeSlot('1'), makeSlot('1')];
        const msg = buildRemovalWarning(['1'], entities, 'rooms', slots);
        assert.ok(msg.includes('"Room 101"'));
        assert.ok(msg.includes('2 slot'));
        assert.ok(msg.includes('Continue?'));
    });

    it('uses the entity ID as fallback name when entity is not in previousEntities', () => {
        const slots = [makeSlot('99')];
        const msg = buildRemovalWarning(['99'], {}, 'rooms', slots);
        assert.ok(msg.includes('"99"'));
    });

    it('lists multiple affected entities correctly', () => {
        const entities = {
            '1': { id: '1', name: 'Room A' },
            '2': { id: '2', name: 'Room B' },
        };
        const slots = [makeSlot('1'), makeSlot('2'), makeSlot('2')];
        const msg = buildRemovalWarning(['1', '2'], entities, 'rooms', slots);
        assert.ok(msg.includes('"Room A"'));
        assert.ok(msg.includes('"Room B"'));
        assert.ok(msg.includes('3 slot'));
    });

    it('uses singular "slot" when only one slot is affected', () => {
        const entities = { '1': { id: '1', name: 'Gym' } };
        const slots = [makeSlot('1')];
        const msg = buildRemovalWarning(['1'], entities, 'rooms', slots);
        assert.ok(msg.includes('1 slot ') || msg.includes('1 slot.') || msg.includes('(1 slot)'));
        assert.ok(!msg.includes('1 slots'));
    });
});

// ── Helpers for save-handler tests ───────────────────────────────────────────

function makeDom(fields) {
    // fields: { '#selector': { value: '...', textContent: '', classList: { add(){}, remove(){} } } }
    for (const [sel, el] of Object.entries(fields)) {
        domStore[sel] = el;
    }
}

function makeErrorEl() {
    return { textContent: '' };
}

function makeBtn() {
    return {
        textContent: 'Save',
        classList: { add() {}, remove() {} },
    };
}

function seedData(overrides = {}) {
    const base = createEmptyTimetableData(2);
    Object.assign(base, overrides);
    _stored = JSON.stringify(base);
    return base;
}

// ── handleSaveStudentGroups ───────────────────────────────────────────────────

describe('handleSaveStudentGroups', () => {
    beforeEach(() => {
        _stored = null;
        makeDom({
            '#student-groups-input': { value: '' },
            '#student-groups-error': makeErrorEl(),
            '#save-student-groups-btn': makeBtn(),
        });
        global.confirm = () => true;
    });

    it('does nothing when no data in storage', () => {
        domStore['#student-groups-input'].value = 'Year 7A';
        handleSaveStudentGroups();
        assert.strictEqual(_stored, null);
    });

    it('saves new student groups', () => {
        seedData();
        domStore['#student-groups-input'].value = 'Year 7A\nYear 7B';
        handleSaveStudentGroups();
        const saved = JSON.parse(_stored);
        const names = Object.values(saved.studentGroups).map(e => e.name);
        assert.deepStrictEqual(names.sort(), ['Year 7A', 'Year 7B']);
    });

    it('shows field error for duplicate names', () => {
        seedData();
        domStore['#student-groups-input'].value = 'Year 7A\nYear 7A';
        handleSaveStudentGroups();
        assert.ok(domStore['#student-groups-error'].textContent.length > 0);
    });

    it('orphans slot references when a group is removed', () => {
        const base = seedData({
            studentGroups: { '1': { id: '1', name: 'Year 7A' } },
            slots: [{ id: 's1', teacherId: '1', period: 1, day: 'Monday', studentGroupId: '1', roomId: null, subjectId: null }],
        });
        domStore['#student-groups-input'].value = ''; // remove all
        global.confirm = () => true;
        handleSaveStudentGroups();
        const saved = JSON.parse(_stored);
        assert.strictEqual(saved.slots[0].studentGroupId, null);
    });

    it('does not save when user cancels removal warning', () => {
        seedData({
            studentGroups: { '1': { id: '1', name: 'Year 7A' } },
            slots: [{ id: 's1', teacherId: '1', period: 1, day: 'Monday', studentGroupId: '1', roomId: null, subjectId: null }],
        });
        const originalStored = _stored;
        domStore['#student-groups-input'].value = '';
        global.confirm = () => false;
        handleSaveStudentGroups();
        assert.strictEqual(_stored, originalStored);
    });
});

// ── handleSaveRooms ───────────────────────────────────────────────────────────

describe('handleSaveRooms', () => {
    beforeEach(() => {
        _stored = null;
        makeDom({
            '#rooms-input': { value: '' },
            '#rooms-error': makeErrorEl(),
            '#save-rooms-btn': makeBtn(),
        });
        global.confirm = () => true;
    });

    it('does nothing when no data in storage', () => {
        domStore['#rooms-input'].value = 'Room 101';
        handleSaveRooms();
        assert.strictEqual(_stored, null);
    });

    it('saves new rooms', () => {
        seedData();
        domStore['#rooms-input'].value = 'Room 101\nGymnasium';
        handleSaveRooms();
        const saved = JSON.parse(_stored);
        const names = Object.values(saved.rooms).map(e => e.name);
        assert.deepStrictEqual(names.sort(), ['Gymnasium', 'Room 101']);
    });

    it('orphans slot references when a room is removed', () => {
        seedData({
            rooms: { '1': { id: '1', name: 'Room 101' } },
            slots: [{ id: 's1', teacherId: '1', period: 1, day: 'Monday', roomId: '1', studentGroupId: null, subjectId: null }],
        });
        domStore['#rooms-input'].value = '';
        global.confirm = () => true;
        handleSaveRooms();
        const saved = JSON.parse(_stored);
        assert.strictEqual(saved.slots[0].roomId, null);
    });

    it('does not save when user cancels removal warning', () => {
        seedData({
            rooms: { '1': { id: '1', name: 'Room 101' } },
            slots: [{ id: 's1', teacherId: '1', period: 1, day: 'Monday', roomId: '1', studentGroupId: null, subjectId: null }],
        });
        const originalStored = _stored;
        domStore['#rooms-input'].value = '';
        global.confirm = () => false;
        handleSaveRooms();
        assert.strictEqual(_stored, originalStored);
    });
});

// ── handleSaveSubjects ────────────────────────────────────────────────────────

describe('handleSaveSubjects', () => {
    beforeEach(() => {
        _stored = null;
        makeDom({
            '#subjects-input': { value: '' },
            '#subjects-error': makeErrorEl(),
            '#save-subjects-btn': makeBtn(),
        });
        global.confirm = () => true;
    });

    it('does nothing when no data in storage', () => {
        domStore['#subjects-input'].value = 'Maths';
        handleSaveSubjects();
        assert.strictEqual(_stored, null);
    });

    it('saves new subjects', () => {
        seedData();
        domStore['#subjects-input'].value = 'Maths\nEnglish';
        handleSaveSubjects();
        const saved = JSON.parse(_stored);
        const names = Object.values(saved.subjects).map(e => e.name);
        assert.deepStrictEqual(names.sort(), ['English', 'Maths']);
    });

    it('orphans slot references when a subject is removed', () => {
        seedData({
            subjects: { '1': { id: '1', name: 'Maths' } },
            slots: [{ id: 's1', teacherId: '1', period: 1, day: 'Monday', subjectId: '1', roomId: null, studentGroupId: null }],
        });
        domStore['#subjects-input'].value = '';
        global.confirm = () => true;
        handleSaveSubjects();
        const saved = JSON.parse(_stored);
        assert.strictEqual(saved.slots[0].subjectId, null);
    });

    it('does not save when user cancels removal warning', () => {
        seedData({
            subjects: { '1': { id: '1', name: 'Maths' } },
            slots: [{ id: 's1', teacherId: '1', period: 1, day: 'Monday', subjectId: '1', roomId: null, studentGroupId: null }],
        });
        const originalStored = _stored;
        domStore['#subjects-input'].value = '';
        global.confirm = () => false;
        handleSaveSubjects();
        assert.strictEqual(_stored, originalStored);
    });
});

// ── handleSaveTeachers (with removal warning) ─────────────────────────────────

describe('handleSaveTeachers', () => {
    beforeEach(() => {
        _stored = null;
        makeDom({
            '#teachers-input': { value: '' },
            '#teachers-error': makeErrorEl(),
            '#save-teachers-btn': makeBtn(),
        });
        global.confirm = () => true;
    });

    it('does nothing when no data in storage', () => {
        domStore['#teachers-input'].value = 'Ms. Smith';
        handleSaveTeachers();
        assert.strictEqual(_stored, null);
    });

    it('saves new teachers', () => {
        seedData();
        domStore['#teachers-input'].value = 'Ms. Smith\nMr. Jones';
        handleSaveTeachers();
        const saved = JSON.parse(_stored);
        const names = Object.values(saved.teachers).map(e => e.name);
        assert.deepStrictEqual(names.sort(), ['Mr. Jones', 'Ms. Smith']);
    });

    it('removes slots for deleted teacher', () => {
        seedData({
            teachers: { '1': { id: '1', name: 'Ms. Smith' } },
            slots: [
                { id: 's1', teacherId: '1', period: 1, day: 'Monday', roomId: null, studentGroupId: null, subjectId: null },
                { id: 's2', teacherId: '1', period: 2, day: 'Monday', roomId: null, studentGroupId: null, subjectId: null },
            ],
        });
        domStore['#teachers-input'].value = ''; // remove all
        global.confirm = () => true;
        handleSaveTeachers();
        const saved = JSON.parse(_stored);
        assert.strictEqual(saved.slots.length, 0);
    });

    it('does not save when user cancels removal warning', () => {
        seedData({
            teachers: { '1': { id: '1', name: 'Ms. Smith' } },
            slots: [{ id: 's1', teacherId: '1', period: 1, day: 'Monday', roomId: null, studentGroupId: null, subjectId: null }],
        });
        const originalStored = _stored;
        domStore['#teachers-input'].value = '';
        global.confirm = () => false;
        handleSaveTeachers();
        assert.strictEqual(_stored, originalStored);
    });
});
