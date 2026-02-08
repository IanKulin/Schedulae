const { describe, it } = require('node:test');
const assert = require('node:assert');
const { escapeHtml, getSortedEntities, debounce, getDateString } = require('../public/js/utils.js');

describe('escapeHtml', () => {
    it('should return empty string for null input', () => {
        assert.strictEqual(escapeHtml(null), '');
    });

    it('should return empty string for undefined input', () => {
        assert.strictEqual(escapeHtml(undefined), '');
    });

    it('should return empty string for empty string input', () => {
        assert.strictEqual(escapeHtml(''), '');
    });

    it('should return unchanged string with no special characters', () => {
        assert.strictEqual(escapeHtml('Hello World'), 'Hello World');
    });

    it('should escape ampersand', () => {
        assert.strictEqual(escapeHtml('Tom & Jerry'), 'Tom &amp; Jerry');
    });

    it('should escape less than sign', () => {
        assert.strictEqual(escapeHtml('a < b'), 'a &lt; b');
    });

    it('should escape greater than sign', () => {
        assert.strictEqual(escapeHtml('a > b'), 'a &gt; b');
    });

    it('should escape double quotes', () => {
        assert.strictEqual(escapeHtml('say "hello"'), 'say &quot;hello&quot;');
    });

    it('should escape single quotes', () => {
        assert.strictEqual(escapeHtml("it's"), 'it&#039;s');
    });

    it('should escape all special characters together', () => {
        assert.strictEqual(
            escapeHtml('<script>alert("XSS & it\'s bad")</script>'),
            '&lt;script&gt;alert(&quot;XSS &amp; it&#039;s bad&quot;)&lt;/script&gt;'
        );
    });
});

describe('getSortedEntities', () => {
    it('should return empty array for null input', () => {
        assert.deepStrictEqual(getSortedEntities(null), []);
    });

    it('should return empty array for undefined input', () => {
        assert.deepStrictEqual(getSortedEntities(undefined), []);
    });

    it('should return empty array for empty object', () => {
        assert.deepStrictEqual(getSortedEntities({}), []);
    });

    it('should return single entity as array', () => {
        const entities = { '1': { name: 'Alice' } };
        const result = getSortedEntities(entities);
        assert.deepStrictEqual(result, [['1', { name: 'Alice' }]]);
    });

    it('should sort entities by numeric ID', () => {
        const entities = {
            '3': { name: 'Charlie' },
            '1': { name: 'Alice' },
            '2': { name: 'Bob' }
        };
        const result = getSortedEntities(entities);
        assert.deepStrictEqual(result, [
            ['1', { name: 'Alice' }],
            ['2', { name: 'Bob' }],
            ['3', { name: 'Charlie' }]
        ]);
    });

    it('should sort numerically not lexicographically', () => {
        const entities = {
            '10': { name: 'Ten' },
            '2': { name: 'Two' },
            '1': { name: 'One' }
        };
        const result = getSortedEntities(entities);
        assert.deepStrictEqual(result, [
            ['1', { name: 'One' }],
            ['2', { name: 'Two' }],
            ['10', { name: 'Ten' }]
        ]);
    });
});

describe('debounce', () => {
    it('should delay function execution', async () => {
        let callCount = 0;
        const fn = () => callCount++;
        const debounced = debounce(fn, 50);

        debounced();
        debounced();
        debounced();

        assert.strictEqual(callCount, 0, 'Function should not be called immediately');

        await new Promise(resolve => setTimeout(resolve, 100));

        assert.strictEqual(callCount, 1, 'Function should be called once after delay');
    });

    it('should pass arguments to the debounced function', async () => {
        let receivedArgs = null;
        const fn = (...args) => { receivedArgs = args; };
        const debounced = debounce(fn, 50);

        debounced('a', 'b', 'c');

        await new Promise(resolve => setTimeout(resolve, 100));

        assert.deepStrictEqual(receivedArgs, ['a', 'b', 'c']);
    });

    it('should reset delay on subsequent calls', async () => {
        let callCount = 0;
        const fn = () => callCount++;
        const debounced = debounce(fn, 50);

        debounced();
        await new Promise(resolve => setTimeout(resolve, 30));
        debounced();
        await new Promise(resolve => setTimeout(resolve, 30));
        debounced();

        assert.strictEqual(callCount, 0, 'Function should not be called yet');

        await new Promise(resolve => setTimeout(resolve, 100));

        assert.strictEqual(callCount, 1, 'Function should only be called once');
    });
});

describe('getDateString', () => {
    it('should return date in YYYY-MM-DD format', () => {
        const result = getDateString();
        // Check format matches YYYY-MM-DD pattern
        assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(result), `Expected YYYY-MM-DD format, got: ${result}`);
    });

    it('should return current date', () => {
        const result = getDateString();
        const now = new Date();
        const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        assert.strictEqual(result, expected);
    });
});
