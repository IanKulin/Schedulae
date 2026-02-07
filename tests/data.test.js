const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
    DAYS,
    createEmptyTimetableData,
    generateEntityId,
    generateSlotId,
    createSlotsForTeacher,
    createAllSlots,
    getSlotById,
    getSlotsForTeacher,
    getSlotsForDayPeriod,
    getSlotsForEntity,
    parseTextareaToNames,
    validatePeriods,
    validateEntityNames,
    validateAllInputs,
    hasValidationErrors,
    findEntityIdByName,
    syncEntities,
    orphanSlotReferences,
    validateTimetableData,
    importFromFile
} = require('../public/js/data.js');

describe('DAYS constant', () => {
    it('should contain weekdays Monday through Friday', () => {
        assert.deepStrictEqual(DAYS, ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    });
});

describe('createEmptyTimetableData', () => {
    it('should create structure with default 6 periods', () => {
        const data = createEmptyTimetableData();

        assert.deepStrictEqual(data.periods, [1, 2, 3, 4, 5, 6]);
        assert.deepStrictEqual(data.teachers, {});
        assert.deepStrictEqual(data.rooms, {});
        assert.deepStrictEqual(data.studentGroups, {});
        assert.deepStrictEqual(data.subjects, {});
        assert.deepStrictEqual(data.slots, []);
    });

    it('should create structure with custom period count', () => {
        const data = createEmptyTimetableData(4);

        assert.deepStrictEqual(data.periods, [1, 2, 3, 4]);
    });
});

describe('generateEntityId', () => {
    it('should return "1" for empty entity collection', () => {
        const data = { teachers: {} };
        const id = generateEntityId('teachers', data);

        assert.strictEqual(id, '1');
    });

    it('should return next sequential ID', () => {
        const data = {
            teachers: {
                '1': { name: 'Teacher 1' },
                '2': { name: 'Teacher 2' }
            }
        };
        const id = generateEntityId('teachers', data);

        assert.strictEqual(id, '3');
    });

    it('should handle gaps in IDs', () => {
        const data = {
            rooms: {
                '1': { name: 'Room 1' },
                '5': { name: 'Room 5' }
            }
        };
        const id = generateEntityId('rooms', data);

        assert.strictEqual(id, '6');
    });
});

describe('generateSlotId', () => {
    it('should generate correct slot ID format', () => {
        const id = generateSlotId('Monday', 1, '5');

        assert.strictEqual(id, 'slot_monday_1_5');
    });

    it('should lowercase the day name', () => {
        const id = generateSlotId('WEDNESDAY', 3, '2');

        assert.strictEqual(id, 'slot_wednesday_3_2');
    });
});

describe('createSlotsForTeacher', () => {
    it('should create slots for all days and periods', () => {
        const periods = [1, 2];
        const slots = createSlotsForTeacher('1', periods);

        // 5 days * 2 periods = 10 slots
        assert.strictEqual(slots.length, 10);
    });

    it('should create slots with correct structure', () => {
        const slots = createSlotsForTeacher('1', [1]);
        const mondaySlot = slots.find(s => s.day === 'Monday');

        assert.strictEqual(mondaySlot.id, 'slot_monday_1_1');
        assert.strictEqual(mondaySlot.day, 'Monday');
        assert.strictEqual(mondaySlot.period, 1);
        assert.strictEqual(mondaySlot.teacherId, '1');
        assert.strictEqual(mondaySlot.studentGroupId, null);
        assert.strictEqual(mondaySlot.roomId, null);
        assert.strictEqual(mondaySlot.subjectId, null);
    });
});

describe('createAllSlots', () => {
    it('should create slots for all teachers', () => {
        const teachers = { '1': {}, '2': {} };
        const periods = [1, 2];
        const slots = createAllSlots(teachers, periods);

        // 2 teachers * 5 days * 2 periods = 20 slots
        assert.strictEqual(slots.length, 20);
    });

    it('should return empty array for no teachers', () => {
        const slots = createAllSlots({}, [1, 2, 3]);

        assert.deepStrictEqual(slots, []);
    });
});

describe('getSlotById', () => {
    it('should find slot by ID', () => {
        const slots = [
            { id: 'slot_monday_1_1', day: 'Monday' },
            { id: 'slot_tuesday_1_1', day: 'Tuesday' }
        ];
        const slot = getSlotById(slots, 'slot_tuesday_1_1');

        assert.strictEqual(slot.day, 'Tuesday');
    });

    it('should return undefined for non-existent ID', () => {
        const slots = [{ id: 'slot_monday_1_1' }];
        const slot = getSlotById(slots, 'nonexistent');

        assert.strictEqual(slot, undefined);
    });
});

describe('getSlotsForTeacher', () => {
    it('should filter slots by teacher ID', () => {
        const slots = [
            { id: '1', teacherId: '1' },
            { id: '2', teacherId: '2' },
            { id: '3', teacherId: '1' }
        ];
        const filtered = getSlotsForTeacher(slots, '1');

        assert.strictEqual(filtered.length, 2);
        assert.ok(filtered.every(s => s.teacherId === '1'));
    });
});

describe('getSlotsForDayPeriod', () => {
    it('should filter slots by day and period', () => {
        const slots = [
            { id: '1', day: 'Monday', period: 1 },
            { id: '2', day: 'Monday', period: 2 },
            { id: '3', day: 'Tuesday', period: 1 }
        ];
        const filtered = getSlotsForDayPeriod(slots, 'Monday', 1);

        assert.strictEqual(filtered.length, 1);
        assert.strictEqual(filtered[0].id, '1');
    });
});

describe('getSlotsForEntity', () => {
    it('should filter slots by teacher ID', () => {
        const slots = [
            { id: '1', teacherId: '1', studentGroupId: '1' },
            { id: '2', teacherId: '2', studentGroupId: '1' },
            { id: '3', teacherId: '1', studentGroupId: '2' }
        ];
        const filtered = getSlotsForEntity('teachers', '1', slots);

        assert.strictEqual(filtered.length, 2);
        assert.ok(filtered.every(s => s.teacherId === '1'));
    });

    it('should filter slots by studentGroup ID', () => {
        const slots = [
            { id: '1', teacherId: '1', studentGroupId: '1' },
            { id: '2', teacherId: '2', studentGroupId: '2' },
            { id: '3', teacherId: '1', studentGroupId: '1' }
        ];
        const filtered = getSlotsForEntity('studentGroups', '1', slots);

        assert.strictEqual(filtered.length, 2);
        assert.ok(filtered.every(s => s.studentGroupId === '1'));
    });

    it('should filter slots by room ID', () => {
        const slots = [
            { id: '1', roomId: '1' },
            { id: '2', roomId: '2' },
            { id: '3', roomId: '1' }
        ];
        const filtered = getSlotsForEntity('rooms', '1', slots);

        assert.strictEqual(filtered.length, 2);
        assert.ok(filtered.every(s => s.roomId === '1'));
    });

    it('should return empty array for unknown entity type', () => {
        const slots = [{ id: '1', teacherId: '1' }];
        const filtered = getSlotsForEntity('unknown', '1', slots);

        assert.deepStrictEqual(filtered, []);
    });
});

// Sprint 3 Tests

describe('parseTextareaToNames', () => {
    it('should split text by newlines and trim', () => {
        const result = parseTextareaToNames('Alice\nBob\nCharlie');
        assert.deepStrictEqual(result, ['Alice', 'Bob', 'Charlie']);
    });

    it('should filter out empty lines', () => {
        const result = parseTextareaToNames('Alice\n\nBob\n\n');
        assert.deepStrictEqual(result, ['Alice', 'Bob']);
    });

    it('should trim whitespace from names', () => {
        const result = parseTextareaToNames('  Alice  \n  Bob  ');
        assert.deepStrictEqual(result, ['Alice', 'Bob']);
    });

    it('should return empty array for empty input', () => {
        assert.deepStrictEqual(parseTextareaToNames(''), []);
        assert.deepStrictEqual(parseTextareaToNames(null), []);
        assert.deepStrictEqual(parseTextareaToNames(undefined), []);
    });

    it('should handle Windows-style line endings', () => {
        const result = parseTextareaToNames('Alice\r\nBob');
        // \r will remain as part of trimmed line, but still works
        assert.strictEqual(result.length, 2);
    });
});

describe('validatePeriods', () => {
    it('should return null for valid positive integers', () => {
        assert.strictEqual(validatePeriods(6), null);
        assert.strictEqual(validatePeriods('6'), null);
        assert.strictEqual(validatePeriods(1), null);
        assert.strictEqual(validatePeriods(20), null);
    });

    it('should return error for non-positive numbers', () => {
        assert.ok(validatePeriods(0) !== null);
        assert.ok(validatePeriods(-1) !== null);
    });

    it('should return error for non-numbers', () => {
        assert.ok(validatePeriods('abc') !== null);
        assert.ok(validatePeriods('') !== null);
    });

    it('should return error for numbers over 20', () => {
        assert.ok(validatePeriods(21) !== null);
    });
});

describe('validateEntityNames', () => {
    it('should return empty array for valid names', () => {
        const errors = validateEntityNames(['Alice', 'Bob', 'Charlie']);
        assert.deepStrictEqual(errors, []);
    });

    it('should detect duplicate names', () => {
        const errors = validateEntityNames(['Alice', 'Bob', 'Alice']);
        assert.ok(errors.length > 0);
        assert.ok(errors.some(e => e.includes('Duplicate')));
    });

    it('should allow empty array', () => {
        const errors = validateEntityNames([]);
        assert.deepStrictEqual(errors, []);
    });
});

describe('validateAllInputs', () => {
    it('should return no errors for valid input', () => {
        const formData = {
            periods: 6,
            teachers: ['Ms. Smith', 'Mr. Jones'],
            studentGroups: ['Year 7'],
            rooms: ['Room 101'],
            subjects: ['Math']
        };
        const errors = validateAllInputs(formData);
        assert.ok(!hasValidationErrors(errors));
    });

    it('should return period error for invalid periods', () => {
        const formData = {
            periods: 0,
            teachers: [],
            studentGroups: [],
            rooms: [],
            subjects: []
        };
        const errors = validateAllInputs(formData);
        assert.ok(errors.periods !== null);
    });

    it('should return teacher error for duplicate teachers', () => {
        const formData = {
            periods: 6,
            teachers: ['Ms. Smith', 'Ms. Smith'],
            studentGroups: [],
            rooms: [],
            subjects: []
        };
        const errors = validateAllInputs(formData);
        assert.ok(errors.teachers !== null);
    });
});

describe('hasValidationErrors', () => {
    it('should return false when all fields are null', () => {
        const errors = { periods: null, teachers: null };
        assert.strictEqual(hasValidationErrors(errors), false);
    });

    it('should return true when any field has an error', () => {
        const errors = { periods: 'error', teachers: null };
        assert.strictEqual(hasValidationErrors(errors), true);
    });
});

describe('findEntityIdByName', () => {
    it('should find entity by exact name match', () => {
        const entities = {
            '1': { id: '1', name: 'Alice' },
            '2': { id: '2', name: 'Bob' }
        };
        assert.strictEqual(findEntityIdByName(entities, 'Bob'), '2');
    });

    it('should return null for non-existent name', () => {
        const entities = { '1': { id: '1', name: 'Alice' } };
        assert.strictEqual(findEntityIdByName(entities, 'Charlie'), null);
    });

    it('should be case-sensitive', () => {
        const entities = { '1': { id: '1', name: 'Alice' } };
        assert.strictEqual(findEntityIdByName(entities, 'alice'), null);
    });
});

describe('syncEntities', () => {
    it('should keep existing entities matched by name', () => {
        const current = { '1': { id: '1', name: 'Alice' } };
        const names = ['Alice'];
        const result = syncEntities(current, names, 'teachers', { teachers: current });

        assert.strictEqual(result.entities['1'].name, 'Alice');
        assert.deepStrictEqual(result.deletedIds, []);
    });

    it('should create new entities for new names', () => {
        const current = { '1': { id: '1', name: 'Alice' } };
        const names = ['Alice', 'Bob'];
        const result = syncEntities(current, names, 'teachers', { teachers: current });

        assert.strictEqual(Object.keys(result.entities).length, 2);
        assert.ok(Object.values(result.entities).some(e => e.name === 'Bob'));
    });

    it('should track deleted entity IDs', () => {
        const current = {
            '1': { id: '1', name: 'Alice' },
            '2': { id: '2', name: 'Bob' }
        };
        const names = ['Alice'];
        const result = syncEntities(current, names, 'teachers', { teachers: current });

        assert.ok(result.deletedIds.includes('2'));
    });
});

describe('orphanSlotReferences', () => {
    it('should set field to null for deleted entity references', () => {
        const slots = [
            { id: '1', studentGroupId: '1' },
            { id: '2', studentGroupId: '2' },
            { id: '3', studentGroupId: '1' }
        ];
        const result = orphanSlotReferences(slots, 'studentGroupId', ['1']);

        assert.strictEqual(result[0].studentGroupId, null);
        assert.strictEqual(result[1].studentGroupId, '2');
        assert.strictEqual(result[2].studentGroupId, null);
    });

    it('should return slots unchanged when no deletions', () => {
        const slots = [{ id: '1', roomId: '1' }];
        const result = orphanSlotReferences(slots, 'roomId', []);

        assert.deepStrictEqual(result, slots);
    });

    it('should handle null field values', () => {
        const slots = [{ id: '1', subjectId: null }];
        const result = orphanSlotReferences(slots, 'subjectId', ['1']);

        assert.strictEqual(result[0].subjectId, null);
    });
});

// Sprint 10 Tests - File Operations

describe('validateTimetableData', () => {
    const validData = {
        periods: [1, 2, 3, 4, 5, 6],
        teachers: { '1': { id: '1', name: 'Ms Smith' } },
        studentGroups: { '1': { id: '1', name: '9A' } },
        rooms: { '1': { id: '1', name: 'Room 12' } },
        subjects: { '1': { id: '1', name: 'Mathematics' } },
        slots: [
            { id: 'slot_monday_1_1', day: 'Monday', period: 1, teacherId: '1' }
        ]
    };

    it('should return true for valid data', () => {
        assert.strictEqual(validateTimetableData(validData), true);
    });

    it('should return false for null or non-object', () => {
        assert.strictEqual(validateTimetableData(null), false);
        assert.strictEqual(validateTimetableData(undefined), false);
        assert.strictEqual(validateTimetableData('string'), false);
        assert.strictEqual(validateTimetableData(123), false);
    });

    it('should return false for missing required keys', () => {
        const missingPeriods = { ...validData };
        delete missingPeriods.periods;
        assert.strictEqual(validateTimetableData(missingPeriods), false);

        const missingTeachers = { ...validData };
        delete missingTeachers.teachers;
        assert.strictEqual(validateTimetableData(missingTeachers), false);

        const missingSlots = { ...validData };
        delete missingSlots.slots;
        assert.strictEqual(validateTimetableData(missingSlots), false);
    });

    it('should return false for invalid periods', () => {
        // Not an array
        assert.strictEqual(validateTimetableData({ ...validData, periods: 'not array' }), false);
        // Empty array
        assert.strictEqual(validateTimetableData({ ...validData, periods: [] }), false);
        // Non-integer values
        assert.strictEqual(validateTimetableData({ ...validData, periods: [1.5, 2] }), false);
        // Negative values
        assert.strictEqual(validateTimetableData({ ...validData, periods: [-1, 2] }), false);
        // Zero
        assert.strictEqual(validateTimetableData({ ...validData, periods: [0, 1] }), false);
    });

    it('should return false for invalid entity objects', () => {
        // Entity missing id
        const missingId = {
            ...validData,
            teachers: { '1': { name: 'Ms Smith' } }
        };
        assert.strictEqual(validateTimetableData(missingId), false);

        // Entity missing name
        const missingName = {
            ...validData,
            teachers: { '1': { id: '1' } }
        };
        assert.strictEqual(validateTimetableData(missingName), false);

        // Entity type is not an object
        const notObject = {
            ...validData,
            rooms: 'not an object'
        };
        assert.strictEqual(validateTimetableData(notObject), false);
    });

    it('should return false for invalid slots', () => {
        // Slots not an array
        assert.strictEqual(validateTimetableData({ ...validData, slots: 'not array' }), false);

        // Slot missing required fields
        const missingSlotId = {
            ...validData,
            slots: [{ day: 'Monday', period: 1, teacherId: '1' }]
        };
        assert.strictEqual(validateTimetableData(missingSlotId), false);

        const missingSlotDay = {
            ...validData,
            slots: [{ id: 'slot1', period: 1, teacherId: '1' }]
        };
        assert.strictEqual(validateTimetableData(missingSlotDay), false);

        const missingSlotPeriod = {
            ...validData,
            slots: [{ id: 'slot1', day: 'Monday', teacherId: '1' }]
        };
        assert.strictEqual(validateTimetableData(missingSlotPeriod), false);

        const missingSlotTeacher = {
            ...validData,
            slots: [{ id: 'slot1', day: 'Monday', period: 1 }]
        };
        assert.strictEqual(validateTimetableData(missingSlotTeacher), false);
    });

    it('should allow empty entities and slots', () => {
        const emptyEntities = {
            periods: [1, 2, 3],
            teachers: {},
            studentGroups: {},
            rooms: {},
            subjects: {},
            slots: []
        };
        assert.strictEqual(validateTimetableData(emptyEntities), true);
    });
});

describe('importFromFile', () => {
    it('should return error for invalid JSON', () => {
        const result = importFromFile('not valid json');
        assert.strictEqual(result.success, false);
        assert.strictEqual(result.error, 'Invalid file: Not valid JSON');
    });

    it('should return error for invalid structure', () => {
        const result = importFromFile(JSON.stringify({ foo: 'bar' }));
        assert.strictEqual(result.success, false);
        assert.strictEqual(result.error, 'Invalid file: Missing required data structure');
    });
});
