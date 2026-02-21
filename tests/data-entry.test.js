const { describe, it } = require('node:test');
const assert = require('node:assert');
const { entitiesToText } = require('../public/js/data-entry.js');

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
        // Lexicographic order would be '1', '10', '2' — wrong
        // Numeric order should be '1', '2', '10' — correct
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
