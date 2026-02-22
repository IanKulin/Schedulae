import { test, expect } from '@playwright/test';
import { seedData, getStoredData, waitForSave, makeData } from './helpers.js';

test('1 period (minimum) - grid renders correctly', async ({ page }) => {
    await seedData(page, makeData({ periodCount: 1, teachers: [{ name: 'T1' }], groups: [], rooms: [], subjects: [] }));
    // 5 days × 1 period = 5 row headers
    await expect(page.locator('.grid-row-header')).toHaveCount(5);
});

test('20 periods (maximum) - grid renders', async ({ page }) => {
    await seedData(page, makeData({ periodCount: 20, teachers: [{ name: 'T1' }], groups: [], rooms: [], subjects: [] }));
    // 5 days × 20 periods = 100 row headers
    await expect(page.locator('.grid-row-header')).toHaveCount(100);
});

test('1 teacher - single column grid', async ({ page }) => {
    await seedData(page, makeData({ periodCount: 1, teachers: [{ name: 'Solo Teacher' }], groups: [], rooms: [], subjects: [] }));
    const teacherCols = page.locator('.grid-header.has-defaults');
    await expect(teacherCols).toHaveCount(1);
});

test('10+ teachers - grid renders all columns', async ({ page }) => {
    const teachers = Array.from({ length: 10 }, (_, i) => ({ name: `Teacher ${i + 1}` }));
    await seedData(page, makeData({ periodCount: 1, teachers, groups: [], rooms: [], subjects: [] }));
    const teacherCols = page.locator('.grid-header.has-defaults');
    await expect(teacherCols).toHaveCount(10);
});

test('0 entities of a type - dropdown shows only blank option', async ({ page }) => {
    await seedData(page, makeData({ periodCount: 1, teachers: [{ name: 'T1' }], groups: [], rooms: [], subjects: [] }));
    const groupDropdown = page.locator('select.cell-dropdown[data-field="studentGroupId"]').first();
    const options = groupDropdown.locator('option');
    await expect(options).toHaveCount(1);
    const firstValue = await options.first().getAttribute('value');
    expect(firstValue === '' || firstValue === null).toBe(true);
});

test('all slots filled - apply defaults does nothing', async ({ page }) => {
    const data = makeData({
        periodCount: 1,
        teachers: [{ name: 'T1' }],
        groups: [{ name: 'Class A' }],
        rooms: [],
        subjects: [],
    });
    for (const slot of data.slots) {
        slot.studentGroupId = '1';
    }
    await seedData(page, data);
    const teacherId = await page.locator('button.defaults-toggle').first().getAttribute('data-teacher-id');
    const toggle = page.locator('button.defaults-toggle').first();
    await toggle.click();
    const defaultSelect = page.locator(`.defaults-panel[data-teacher-id="${teacherId}"] select[data-field="studentGroupId"]`);
    await defaultSelect.selectOption('1');
    await page.locator('.defaults-apply-btn').click();
    await waitForSave(page);
    const stored = await getStoredData(page);
    for (const slot of stored.slots) {
        expect(slot.studentGroupId).toBe('1');
    }
});

test('rapid dropdown changes - final value correct after debounce', async ({ page }) => {
    await seedData(page, makeData({
        periodCount: 1,
        teachers: [{ name: 'T1' }],
        groups: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
        rooms: [],
        subjects: [],
    }));
    const groupDropdown = page.locator('select.cell-dropdown[data-field="studentGroupId"]').first();
    await groupDropdown.selectOption('1');
    await groupDropdown.selectOption('2');
    await groupDropdown.selectOption('3');
    await groupDropdown.selectOption('2');
    await waitForSave(page);
    const stored = await getStoredData(page);
    const slot = stored.slots[0];
    expect(slot.studentGroupId).toBe('2');
});
