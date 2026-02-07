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
    getSlotsForDayPeriod
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
