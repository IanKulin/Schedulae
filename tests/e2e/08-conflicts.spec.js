import { test, expect } from '@playwright/test';
import { seedData, getStoredData, waitForSave, makeData, findSlot } from './helpers.js';

/**
 * Build data with two teachers sharing slots at the same day/period,
 * useful for triggering conflicts.
 */
function makeConflictData() {
    return makeData({
        periodCount: 2,
        teachers: [{ name: 'Ms. Smith' }, { name: 'Mr. Jones' }],
        groups: [{ name: 'Class A' }, { name: 'Class B' }],
        rooms: [{ name: 'Room 1' }, { name: 'Room 2' }],
        subjects: [{ name: 'Maths' }],
    });
}

test('same student group at same day/period highlights both cells', async ({ page }) => {
    await seedData(page, makeConflictData());
    // Select Class A for both teachers in Monday P1
    const groupId = '1';
    const groupDropdowns = page.locator('select.cell-dropdown[data-field="studentGroupId"]');
    // First two dropdowns correspond to Monday P1 for teacher 1 and teacher 2
    await groupDropdowns.nth(0).selectOption(groupId);
    await waitForSave(page);
    await groupDropdowns.nth(1).selectOption(groupId);
    await waitForSave(page);
    // Both cells should have conflict class
    const conflictCells = page.locator('.cell-conflict');
    await expect(conflictCells).toHaveCount(2);
});

test('same room at same day/period highlights both cells', async ({ page }) => {
    await seedData(page, makeConflictData());
    const roomId = '1';
    const roomDropdowns = page.locator('select.cell-dropdown[data-field="roomId"]');
    await roomDropdowns.nth(0).selectOption(roomId);
    await waitForSave(page);
    await roomDropdowns.nth(1).selectOption(roomId);
    await waitForSave(page);
    const conflictCells = page.locator('.cell-conflict');
    await expect(conflictCells).toHaveCount(2);
});

test('hover conflicted cell shows tooltip', async ({ page }) => {
    await seedData(page, makeConflictData());
    const groupId = '1';
    const groupDropdowns = page.locator('select.cell-dropdown[data-field="studentGroupId"]');
    await groupDropdowns.nth(0).selectOption(groupId);
    await waitForSave(page);
    await groupDropdowns.nth(1).selectOption(groupId);
    await waitForSave(page);
    // Hover the first conflicted cell
    const conflictCell = page.locator('.cell-conflict').first();
    await conflictCell.hover();
    await expect(page.locator('.conflict-tooltip')).toBeVisible();
});

test('tooltip disappears when mouse leaves cell', async ({ page }) => {
    await seedData(page, makeConflictData());
    const groupId = '1';
    const groupDropdowns = page.locator('select.cell-dropdown[data-field="studentGroupId"]');
    await groupDropdowns.nth(0).selectOption(groupId);
    await waitForSave(page);
    await groupDropdowns.nth(1).selectOption(groupId);
    await waitForSave(page);
    const conflictCell = page.locator('.cell-conflict').first();
    await conflictCell.hover();
    // Move mouse away
    await page.mouse.move(0, 0);
    await expect(page.locator('.conflict-tooltip')).not.toBeVisible();
});

test('resolving conflict removes cell-conflict class', async ({ page }) => {
    await seedData(page, makeConflictData());
    const groupId = '1';
    const groupDropdowns = page.locator('select.cell-dropdown[data-field="studentGroupId"]');
    await groupDropdowns.nth(0).selectOption(groupId);
    await waitForSave(page);
    await groupDropdowns.nth(1).selectOption(groupId);
    await waitForSave(page);
    // Resolve by changing second dropdown to a different group
    await groupDropdowns.nth(1).selectOption('2');
    await waitForSave(page);
    const conflictCells = page.locator('.cell-conflict');
    await expect(conflictCells).toHaveCount(0);
});

test('three-way conflict highlights all three cells', async ({ page }) => {
    const data = makeData({
        periodCount: 1,
        teachers: [{ name: 'T1' }, { name: 'T2' }, { name: 'T3' }],
        groups: [{ name: 'Class A' }],
        rooms: [],
        subjects: [],
    });
    await seedData(page, data);
    const groupId = '1';
    const groupDropdowns = page.locator('select.cell-dropdown[data-field="studentGroupId"]');
    await groupDropdowns.nth(0).selectOption(groupId);
    await waitForSave(page);
    await groupDropdowns.nth(1).selectOption(groupId);
    await waitForSave(page);
    await groupDropdowns.nth(2).selectOption(groupId);
    await waitForSave(page);
    const conflictCells = page.locator('.cell-conflict');
    await expect(conflictCells).toHaveCount(3);
});

test('tooltip text names the conflicting entity and the other teacher', async ({ page }) => {
    await seedData(page, makeConflictData());
    const groupId = '1';
    const groupDropdowns = page.locator('select.cell-dropdown[data-field="studentGroupId"]');
    await groupDropdowns.nth(0).selectOption(groupId);
    await waitForSave(page);
    await groupDropdowns.nth(1).selectOption(groupId);
    await waitForSave(page);
    const conflictCell = page.locator('.cell-conflict').first();
    await conflictCell.hover();
    const tooltip = page.locator('.conflict-tooltip');
    await expect(tooltip).toBeVisible();
    // Tooltip should mention the conflicting entity name and the other teacher
    await expect(tooltip).toContainText('Class A');
    await expect(tooltip).toContainText(/Ms\. Smith|Mr\. Jones/);
});

test('conflicting dropdown gets dropdown-conflict class', async ({ page }) => {
    await seedData(page, makeConflictData());
    const groupId = '1';
    const groupDropdowns = page.locator('select.cell-dropdown[data-field="studentGroupId"]');
    await groupDropdowns.nth(0).selectOption(groupId);
    await waitForSave(page);
    await groupDropdowns.nth(1).selectOption(groupId);
    await waitForSave(page);
    // Both student-group dropdowns in the conflicting cells should have dropdown-conflict
    const conflictDropdowns = page.locator('select.cell-dropdown[data-field="studentGroupId"].dropdown-conflict');
    await expect(conflictDropdowns).toHaveCount(2);
    // Room dropdowns should NOT have dropdown-conflict (room is not conflicting)
    const roomConflictDropdowns = page.locator('select.cell-dropdown[data-field="roomId"].dropdown-conflict');
    await expect(roomConflictDropdowns).toHaveCount(0);
});

test('blank fields do not cause conflict', async ({ page }) => {
    await seedData(page, makeConflictData());
    // Both cells at Monday P1 blank by default
    const conflictCells = page.locator('.cell-conflict');
    await expect(conflictCells).toHaveCount(0);
});

test('same group at different times is not a conflict', async ({ page }) => {
    await seedData(page, makeConflictData());
    const groupId = '1';
    const groupDropdowns = page.locator('select.cell-dropdown[data-field="studentGroupId"]');
    // Teacher1 Monday P1, Teacher2 Monday P2 (different rows)
    await groupDropdowns.nth(0).selectOption(groupId);
    await waitForSave(page);
    // nth(3) = teacher2, period2 (2 teachers × 2 periods, Monday only for first 4)
    await groupDropdowns.nth(3).selectOption(groupId);
    await waitForSave(page);
    const conflictCells = page.locator('.cell-conflict');
    await expect(conflictCells).toHaveCount(0);
});
