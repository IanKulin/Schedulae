import { test, expect } from '@playwright/test';
import { seedData, getStoredData, waitForSave, makeData } from './helpers.js';

test.beforeEach(async ({ page }) => {
    await seedData(page, makeData({
        periodCount: 3,
        teachers: [{ name: 'Ms. Smith' }, { name: 'Mr. Jones' }],
        groups: [{ name: 'Class A' }],
        rooms: [{ name: 'Room 1' }],
        subjects: [{ name: 'Maths' }],
    }));
    // App loads on builder page
});

test('grid shows correct number of rows (days × periods)', async ({ page }) => {
    // Row headers: one per day+period combination = 5 days × 3 periods = 15
    const rowHeaders = page.locator('.grid-row-header');
    await expect(rowHeaders).toHaveCount(15);
});

test('grid shows correct number of teacher columns', async ({ page }) => {
    // Teacher headers are grid-header cells (excluding the corner)
    const teacherHeaders = page.locator('.grid-header.has-defaults');
    const count = await teacherHeaders.count();
    expect(count).toBe(2);
});

test('no teachers shows empty state with setup link', async ({ page }) => {
    await seedData(page, makeData({ teachers: [], groups: [], rooms: [], subjects: [] }));
    await expect(page.locator('#empty-state')).toBeVisible();
    await expect(page.locator('#empty-state-link')).toBeVisible();
});

test('empty state setup link navigates to setup page', async ({ page }) => {
    await seedData(page, makeData({ teachers: [], groups: [], rooms: [], subjects: [] }));
    await page.locator('#empty-state-link').click();
    await expect(page.locator('#page-setup')).toBeVisible();
});

test('each cell has three dropdowns', async ({ page }) => {
    const cell = page.locator('.grid-data-cell').first();
    const dropdowns = cell.locator('select');
    await expect(dropdowns).toHaveCount(3);
});

test('first dropdown option is blank', async ({ page }) => {
    const firstDropdown = page.locator('select.cell-dropdown[data-field="studentGroupId"]').first();
    const firstOption = firstDropdown.locator('option').first();
    const value = await firstOption.getAttribute('value');
    expect(value === '' || value === null).toBe(true);
});

test('selecting a value saves to localStorage after debounce', async ({ page }) => {
    const groupId = '1';
    const firstDropdown = page.locator('select.cell-dropdown[data-field="studentGroupId"]').first();
    await firstDropdown.selectOption(groupId);
    await waitForSave(page);
    const data = await getStoredData(page);
    const filledSlot = data.slots.find(s => s.studentGroupId === groupId);
    expect(filledSlot).toBeDefined();
});

test('selecting blank clears field to null in localStorage', async ({ page }) => {
    const groupId = '1';
    const firstDropdown = page.locator('select.cell-dropdown[data-field="studentGroupId"]').first();
    await firstDropdown.selectOption(groupId);
    await waitForSave(page);
    await firstDropdown.selectOption('');
    await waitForSave(page);
    const data = await getStoredData(page);
    const filledSlot = data.slots.find(s => s.studentGroupId === groupId);
    expect(filledSlot).toBeUndefined();
});

test('all selections persist after reload', async ({ page }) => {
    const groupId = '1';
    const firstDropdown = page.locator('select.cell-dropdown[data-field="studentGroupId"]').first();
    await firstDropdown.selectOption(groupId);
    await waitForSave(page);
    await page.reload();
    const firstDropdownAfter = page.locator('select.cell-dropdown[data-field="studentGroupId"]').first();
    await expect(firstDropdownAfter).toHaveValue(groupId);
});

test('sticky headers: grid-container has overflow', async ({ page }) => {
    const container = page.locator('#grid-container');
    const overflow = await container.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.overflow + ' ' + style.overflowX + ' ' + style.overflowY;
    });
    expect(overflow.toLowerCase()).toMatch(/auto|scroll/);
});
