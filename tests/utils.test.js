const { describe, it } = require('node:test');
const assert = require('node:assert');
const { debounce } = require('../public/js/utils.js');

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
