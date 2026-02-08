/**
 * Tests for conflict detection functions
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

const {
    DAYS,
    detectConflicts,
    detectEntityConflicts,
    createEmptyTimetableData,
    createSlotsForTeacher
} = require('../public/js/data.js');

/**
 * Helper to create test data with teachers and slots
 */
function createTestData(teachers, options = {}) {
    const data = createEmptyTimetableData(options.periods || 6);

    // Add teachers
    for (let i = 0; i < teachers.length; i++) {
        const id = String(i + 1);
        data.teachers[id] = { id, name: teachers[i] };
    }

    // Create slots for all teachers
    data.slots = [];
    for (const teacherId of Object.keys(data.teachers)) {
        const slots = createSlotsForTeacher(teacherId, data.periods);
        data.slots.push(...slots);
    }

    // Add student groups if provided
    if (options.studentGroups) {
        for (let i = 0; i < options.studentGroups.length; i++) {
            const id = String(i + 1);
            data.studentGroups[id] = { id, name: options.studentGroups[i] };
        }
    }

    // Add rooms if provided
    if (options.rooms) {
        for (let i = 0; i < options.rooms.length; i++) {
            const id = String(i + 1);
            data.rooms[id] = { id, name: options.rooms[i] };
        }
    }

    return data;
}

/**
 * Helper to find and update a slot
 */
function updateSlot(data, day, period, teacherId, updates) {
    const slot = data.slots.find(s =>
        s.day === day &&
        s.period === period &&
        s.teacherId === teacherId
    );
    if (slot) {
        Object.assign(slot, updates);
    }
    return slot;
}

describe('detectConflicts', () => {
    it('returns empty map when no conflicts exist', () => {
        const data = createTestData(['Teacher A', 'Teacher B'], {
            studentGroups: ['9A', '9B'],
            rooms: ['Room 1', 'Room 2']
        });

        // Assign different student groups and rooms to each teacher
        updateSlot(data, 'Monday', 1, '1', { studentGroupId: '1', roomId: '1' });
        updateSlot(data, 'Monday', 1, '2', { studentGroupId: '2', roomId: '2' });

        const conflicts = detectConflicts(data);
        assert.deepStrictEqual(conflicts, {});
    });

    it('detects student group double-booking', () => {
        const data = createTestData(['Teacher A', 'Teacher B'], {
            studentGroups: ['9A', '9B'],
            rooms: ['Room 1', 'Room 2']
        });

        // Both teachers have the same student group at the same time
        updateSlot(data, 'Monday', 1, '1', { studentGroupId: '1', roomId: '1' });
        updateSlot(data, 'Monday', 1, '2', { studentGroupId: '1', roomId: '2' });

        const conflicts = detectConflicts(data);

        // Both slots should have a conflict
        assert.ok(conflicts['slot_monday_1_1'], 'Slot 1 should have conflicts');
        assert.ok(conflicts['slot_monday_1_2'], 'Slot 2 should have conflicts');

        // Check conflict details
        const conflict1 = conflicts['slot_monday_1_1'][0];
        assert.strictEqual(conflict1.type, 'studentGroup');
        assert.strictEqual(conflict1.entityId, '1');
        assert.strictEqual(conflict1.entityName, '9A');
        assert.strictEqual(conflict1.slotIds.length, 2);
    });

    it('detects room double-booking', () => {
        const data = createTestData(['Teacher A', 'Teacher B'], {
            studentGroups: ['9A', '9B'],
            rooms: ['Room 1', 'Room 2']
        });

        // Both teachers have the same room at the same time
        updateSlot(data, 'Tuesday', 2, '1', { studentGroupId: '1', roomId: '1' });
        updateSlot(data, 'Tuesday', 2, '2', { studentGroupId: '2', roomId: '1' });

        const conflicts = detectConflicts(data);

        // Both slots should have a conflict
        assert.ok(conflicts['slot_tuesday_2_1'], 'Slot 1 should have conflicts');
        assert.ok(conflicts['slot_tuesday_2_2'], 'Slot 2 should have conflicts');

        // Check conflict details
        const conflict1 = conflicts['slot_tuesday_2_1'][0];
        assert.strictEqual(conflict1.type, 'room');
        assert.strictEqual(conflict1.entityId, '1');
        assert.strictEqual(conflict1.entityName, 'Room 1');
    });

    it('detects multiple conflicts in the same slot', () => {
        const data = createTestData(['Teacher A', 'Teacher B'], {
            studentGroups: ['9A'],
            rooms: ['Room 1']
        });

        // Both teachers have the same student group AND same room at the same time
        updateSlot(data, 'Wednesday', 3, '1', { studentGroupId: '1', roomId: '1' });
        updateSlot(data, 'Wednesday', 3, '2', { studentGroupId: '1', roomId: '1' });

        const conflicts = detectConflicts(data);

        // Both slots should have 2 conflicts (studentGroup + room)
        assert.strictEqual(conflicts['slot_wednesday_3_1'].length, 2);
        assert.strictEqual(conflicts['slot_wednesday_3_2'].length, 2);

        const types = conflicts['slot_wednesday_3_1'].map(c => c.type);
        assert.ok(types.includes('studentGroup'), 'Should have studentGroup conflict');
        assert.ok(types.includes('room'), 'Should have room conflict');
    });

    it('detects conflicts across different day/period combinations', () => {
        const data = createTestData(['Teacher A', 'Teacher B'], {
            studentGroups: ['9A', '9B'],
            rooms: ['Room 1', 'Room 2']
        });

        // Conflict on Monday P1
        updateSlot(data, 'Monday', 1, '1', { studentGroupId: '1', roomId: '1' });
        updateSlot(data, 'Monday', 1, '2', { studentGroupId: '1', roomId: '2' });

        // Conflict on Friday P6
        updateSlot(data, 'Friday', 6, '1', { studentGroupId: '2', roomId: '1' });
        updateSlot(data, 'Friday', 6, '2', { studentGroupId: '2', roomId: '2' });

        const conflicts = detectConflicts(data);

        // Should have 4 slots with conflicts
        assert.ok(conflicts['slot_monday_1_1']);
        assert.ok(conflicts['slot_monday_1_2']);
        assert.ok(conflicts['slot_friday_6_1']);
        assert.ok(conflicts['slot_friday_6_2']);
    });

    it('does not flag null/empty entity values as conflicts', () => {
        const data = createTestData(['Teacher A', 'Teacher B'], {
            studentGroups: ['9A'],
            rooms: ['Room 1']
        });

        // Both slots have null studentGroupId and null roomId - should not conflict
        // (slots are created with null by default)
        const conflicts = detectConflicts(data);
        assert.deepStrictEqual(conflicts, {});
    });

    it('does not flag same entity in different time slots as conflict', () => {
        const data = createTestData(['Teacher A', 'Teacher B'], {
            studentGroups: ['9A'],
            rooms: ['Room 1']
        });

        // Same student group but different periods - not a conflict
        updateSlot(data, 'Monday', 1, '1', { studentGroupId: '1', roomId: '1' });
        updateSlot(data, 'Monday', 2, '1', { studentGroupId: '1', roomId: '1' });

        const conflicts = detectConflicts(data);
        assert.deepStrictEqual(conflicts, {});
    });

    it('handles empty data gracefully', () => {
        const conflicts1 = detectConflicts(null);
        assert.deepStrictEqual(conflicts1, {});

        const conflicts2 = detectConflicts({});
        assert.deepStrictEqual(conflicts2, {});

        const conflicts3 = detectConflicts({ slots: [], periods: [] });
        assert.deepStrictEqual(conflicts3, {});
    });

    it('includes correct other teachers in conflict', () => {
        const data = createTestData(['Ms Smith', 'Mr Jones', 'Dr Brown'], {
            studentGroups: ['9A'],
            rooms: ['Room 1', 'Room 2', 'Room 3']
        });

        // Three teachers with the same student group at the same time
        updateSlot(data, 'Monday', 1, '1', { studentGroupId: '1', roomId: '1' });
        updateSlot(data, 'Monday', 1, '2', { studentGroupId: '1', roomId: '2' });
        updateSlot(data, 'Monday', 1, '3', { studentGroupId: '1', roomId: '3' });

        const conflicts = detectConflicts(data);

        // Check that each slot's conflict shows the other two teachers
        const conflict1 = conflicts['slot_monday_1_1'][0];
        assert.strictEqual(conflict1.otherTeachers.length, 2);
        assert.ok(conflict1.otherTeachers.includes('Mr Jones'));
        assert.ok(conflict1.otherTeachers.includes('Dr Brown'));

        const conflict2 = conflicts['slot_monday_1_2'][0];
        assert.strictEqual(conflict2.otherTeachers.length, 2);
        assert.ok(conflict2.otherTeachers.includes('Ms Smith'));
        assert.ok(conflict2.otherTeachers.includes('Dr Brown'));
    });
});

describe('detectEntityConflicts', () => {
    it('groups slots correctly by entity ID', () => {
        const conflictMap = {};
        const slotsAtTime = [
            { id: 'slot_1', teacherId: '1', studentGroupId: '1' },
            { id: 'slot_2', teacherId: '2', studentGroupId: '1' },
            { id: 'slot_3', teacherId: '3', studentGroupId: '2' }
        ];
        const studentGroups = {
            '1': { id: '1', name: '9A' },
            '2': { id: '2', name: '9B' }
        };
        const teachers = {
            '1': { id: '1', name: 'Teacher A' },
            '2': { id: '2', name: 'Teacher B' },
            '3': { id: '3', name: 'Teacher C' }
        };

        detectEntityConflicts(
            slotsAtTime,
            'studentGroupId',
            'studentGroup',
            studentGroups,
            teachers,
            'Monday',
            1,
            conflictMap
        );

        // Only slots 1 and 2 should have conflicts (same studentGroupId)
        assert.ok(conflictMap['slot_1']);
        assert.ok(conflictMap['slot_2']);
        assert.ok(!conflictMap['slot_3']);
    });

    it('skips slots with null entity values', () => {
        const conflictMap = {};
        const slotsAtTime = [
            { id: 'slot_1', teacherId: '1', studentGroupId: null },
            { id: 'slot_2', teacherId: '2', studentGroupId: null }
        ];

        detectEntityConflicts(
            slotsAtTime,
            'studentGroupId',
            'studentGroup',
            {},
            { '1': { name: 'A' }, '2': { name: 'B' } },
            'Monday',
            1,
            conflictMap
        );

        assert.deepStrictEqual(conflictMap, {});
    });
});
