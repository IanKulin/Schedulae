const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
    DAYS,
    createEmptyTimetableData,
    createSlotsForTeacher,
    createAllSlots,
    generateSlotId
} = require('../public/js/data.js');
const {
    validateTeacherName,
    renameTeacher,
    deleteTeacher,
    addTeacherAfter
} = require('../public/js/data-ops.js');

/**
 * Helper: create test data with teachers and slots
 */
function createTestData() {
    const data = createEmptyTimetableData(2); // 2 periods for brevity
    data.teachers = {
        '1': { id: '1', name: 'Alice' },
        '2': { id: '2', name: 'Bob' },
        '3': { id: '3', name: 'Charlie' }
    };
    data.slots = createAllSlots(data.teachers, data.periods.map(p => p.id));

    // Set some slot data to verify preservation
    const slot = data.slots.find(s => s.teacherId === '2' && s.day === 'Monday' && s.period === 1);
    if (slot) {
        slot.studentGroupId = 'sg1';
        slot.roomId = 'r1';
        slot.subjectId = 'sub1';
    }

    return data;
}

describe('validateTeacherName', () => {
    it('should return null for a valid name', () => {
        assert.strictEqual(validateTeacherName('Diana'), null);
    });

    it('should reject empty string', () => {
        assert.strictEqual(validateTeacherName(''), 'Name cannot be blank');
    });

    it('should reject whitespace-only string', () => {
        assert.strictEqual(validateTeacherName('   '), 'Name cannot be blank');
    });

    it('should allow duplicate names', () => {
        assert.strictEqual(validateTeacherName('Alice'), null);
    });

    it('should allow special characters', () => {
        assert.strictEqual(validateTeacherName("O'Brien-Smith (Rm 2)"), null);
    });
});

describe('renameTeacher', () => {
    it('should rename a teacher successfully', () => {
        const data = createTestData();
        const result = renameTeacher(data, '1', 'Alicia');
        assert.deepStrictEqual(result, { success: true });
        assert.strictEqual(data.teachers['1'].name, 'Alicia');
    });

    it('should trim the new name', () => {
        const data = createTestData();
        renameTeacher(data, '1', '  Alicia  ');
        assert.strictEqual(data.teachers['1'].name, 'Alicia');
    });

    it('should fail for invalid name', () => {
        const data = createTestData();
        const result = renameTeacher(data, '1', '');
        assert.strictEqual(result.success, false);
        assert.ok(result.error);
        // Name should be unchanged
        assert.strictEqual(data.teachers['1'].name, 'Alice');
    });

});

describe('deleteTeacher', () => {
    it('should remove the teacher from data.teachers', () => {
        const data = createTestData();
        deleteTeacher(data, '2');
        assert.strictEqual(data.teachers['2'], undefined);
        assert.strictEqual(Object.keys(data.teachers).length, 2);
    });

    it('should remove all slots for the deleted teacher', () => {
        const data = createTestData();
        deleteTeacher(data, '2');
        const remainingSlots = data.slots.filter(s => s.teacherId === '2');
        assert.strictEqual(remainingSlots.length, 0);
    });

    it('should preserve slots for other teachers', () => {
        const data = createTestData();
        const slotsBeforeT1 = data.slots.filter(s => s.teacherId === '1').length;
        const slotsBeforeT3 = data.slots.filter(s => s.teacherId === '3').length;
        deleteTeacher(data, '2');
        assert.strictEqual(data.slots.filter(s => s.teacherId === '1').length, slotsBeforeT1);
        assert.strictEqual(data.slots.filter(s => s.teacherId === '3').length, slotsBeforeT3);
    });
});

describe('addTeacherAfter', () => {
    it('should add a new teacher at the correct position', () => {
        const data = createTestData();
        const result = addTeacherAfter(data, '1', 'Diana');
        assert.strictEqual(result.success, true);

        // Sorted order should be: Alice(1), Diana(2), Bob(3), Charlie(4)
        const names = Object.entries(data.teachers)
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
            .map(([, t]) => t.name);
        assert.deepStrictEqual(names, ['Alice', 'Diana', 'Bob', 'Charlie']);
    });

    it('should reassign all teacher IDs sequentially', () => {
        const data = createTestData();
        addTeacherAfter(data, '1', 'Diana');
        const ids = Object.keys(data.teachers).sort((a, b) => parseInt(a) - parseInt(b));
        assert.deepStrictEqual(ids, ['1', '2', '3', '4']);
    });

    it('should update all slot teacherIds to match new IDs', () => {
        const data = createTestData();
        addTeacherAfter(data, '1', 'Diana');

        // Every slot's teacherId should exist in data.teachers
        for (const slot of data.slots) {
            assert.ok(data.teachers[slot.teacherId],
                `Slot ${slot.id} has teacherId ${slot.teacherId} which is not in teachers`);
        }
    });

    it('should regenerate all slot IDs', () => {
        const data = createTestData();
        addTeacherAfter(data, '1', 'Diana');

        for (const slot of data.slots) {
            const expected = generateSlotId(slot.day, slot.period, slot.teacherId);
            assert.strictEqual(slot.id, expected,
                `Slot ID mismatch: ${slot.id} !== ${expected}`);
        }
    });

    it('should create slots for the new teacher across all days/periods', () => {
        const data = createTestData();
        const result = addTeacherAfter(data, '1', 'Diana');
        const newTeacherSlots = data.slots.filter(s => s.teacherId === result.newTeacherId);
        // 5 days * 2 periods = 10 slots
        assert.strictEqual(newTeacherSlots.length, DAYS.length * data.periods.length);
    });

    it('should preserve slot data through ID reassignment', () => {
        const data = createTestData();

        // Bob (id 2) has a slot with data on Monday P1
        // After add, Bob becomes id 3
        addTeacherAfter(data, '1', 'Diana');

        // Find the slot that should be Bob's Monday P1 (Bob is now teacher 3)
        const bobSlot = data.slots.find(s =>
            s.teacherId === '3' && s.day === 'Monday' && s.period === 1
        );
        assert.ok(bobSlot, 'Bob Monday P1 slot should exist');
        assert.strictEqual(bobSlot.studentGroupId, 'sg1');
        assert.strictEqual(bobSlot.roomId, 'r1');
        assert.strictEqual(bobSlot.subjectId, 'sub1');
    });

    it('should work when adding after the last teacher', () => {
        const data = createTestData();
        const result = addTeacherAfter(data, '3', 'Diana');
        assert.strictEqual(result.success, true);

        const names = Object.entries(data.teachers)
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
            .map(([, t]) => t.name);
        assert.deepStrictEqual(names, ['Alice', 'Bob', 'Charlie', 'Diana']);
    });

    it('should work when adding after the first teacher', () => {
        const data = createTestData();
        const result = addTeacherAfter(data, '1', 'Diana');
        assert.strictEqual(result.success, true);

        const names = Object.entries(data.teachers)
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
            .map(([, t]) => t.name);
        assert.deepStrictEqual(names, ['Alice', 'Diana', 'Bob', 'Charlie']);
    });

    it('should return the correct newTeacherId', () => {
        const data = createTestData();
        const result = addTeacherAfter(data, '2', 'Diana');
        assert.strictEqual(result.success, true);
        assert.strictEqual(data.teachers[result.newTeacherId].name, 'Diana');
    });
});
