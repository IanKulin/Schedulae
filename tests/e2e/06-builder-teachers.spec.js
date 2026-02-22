import { test, expect } from '@playwright/test';
import { seedData, getStoredData, waitForSave, makeData } from './helpers.js';

test.beforeEach(async ({ page }) => {
    await seedData(page, makeData({
        periodCount: 2,
        teachers: [{ name: 'Ms. Smith' }],
        groups: [{ name: 'Class A' }],
        rooms: [{ name: 'Room 1' }],
        subjects: [{ name: 'Maths' }],
    }));
});

async function enterTeacherEditMode(page, teacherName) {
    await page.locator(`.teacher-header-name:has-text("${teacherName}")`).click();
}

test('clicking teacher name enters edit mode', async ({ page }) => {
    await enterTeacherEditMode(page, 'Ms. Smith');
    await expect(page.locator('input.teacher-edit-input')).toBeVisible();
    await expect(page.locator('button.teacher-edit-trash')).toBeVisible();
});

test('rename teacher and press Enter saves and updates header', async ({ page }) => {
    await enterTeacherEditMode(page, 'Ms. Smith');
    const input = page.locator('input.teacher-edit-input');
    await input.fill('Mrs. Brown');
    await input.press('Enter');
    await expect(page.locator('#timetable-grid')).toContainText('Mrs. Brown');
    const data = await getStoredData(page);
    const names = Object.values(data.teachers).map(t => t.name);
    expect(names).toContain('Mrs. Brown');
});

test('press Escape reverts teacher name', async ({ page }) => {
    await enterTeacherEditMode(page, 'Ms. Smith');
    const input = page.locator('input.teacher-edit-input');
    await input.fill('Changed Name');
    await input.press('Escape');
    await expect(page.locator('#timetable-grid')).toContainText('Ms. Smith');
});

test('save empty teacher name shows error', async ({ page }) => {
    await enterTeacherEditMode(page, 'Ms. Smith');
    const input = page.locator('input.teacher-edit-input');
    await input.fill('');
    await input.press('Enter');
    // Input should still be visible (error dialog shown, still in edit mode)
    await expect(page.locator('input.teacher-edit-input')).toBeVisible();
});

test('trash button shows confirm dialog', async ({ page }) => {
    await enterTeacherEditMode(page, 'Ms. Smith');
    let dialogShown = false;
    page.once('dialog', dialog => {
        dialogShown = true;
        dialog.dismiss();
    });
    await page.locator('button.teacher-edit-trash').click();
    expect(dialogShown).toBe(true);
});

test('confirm delete removes teacher column', async ({ page }) => {
    await enterTeacherEditMode(page, 'Ms. Smith');
    page.once('dialog', dialog => dialog.accept());
    await page.locator('button.teacher-edit-trash').click();
    await expect(page.locator('#timetable-grid')).not.toContainText('Ms. Smith');
    const data = await getStoredData(page);
    const names = Object.values(data.teachers).map(t => t.name);
    expect(names).not.toContain('Ms. Smith');
});

test('cancel delete stays in edit mode', async ({ page }) => {
    await enterTeacherEditMode(page, 'Ms. Smith');
    page.once('dialog', dialog => dialog.dismiss());
    await page.locator('button.teacher-edit-trash').click();
    await expect(page.locator('input.teacher-edit-input')).toBeVisible();
});

test('+ button adds new teacher column', async ({ page }) => {
    await enterTeacherEditMode(page, 'Ms. Smith');
    await page.locator('button.teacher-edit-add').click();
    const data = await getStoredData(page);
    const names = Object.values(data.teachers).map(t => t.name);
    expect(names.length).toBe(2);
    expect(names).toContain('New Teacher');
});

test('defaults panel expands when clicking toggle', async ({ page }) => {
    const toggle = page.locator('button.defaults-toggle').first();
    await toggle.click();
    await expect(page.locator('.defaults-panel.expanded')).toBeVisible();
});

test('apply defaults fills only blank cells', async ({ page }) => {
    // Open defaults panel
    const toggle = page.locator('button.defaults-toggle').first();
    await toggle.click();
    // Set a default student group
    const groupId = '1';
    const teacherId = await page.locator('button.defaults-toggle').first().getAttribute('data-teacher-id');
    const defaultSelect = page.locator(`.defaults-panel[data-teacher-id="${teacherId}"] select[data-field="studentGroupId"]`);
    await defaultSelect.selectOption(groupId);
    await page.locator('.defaults-apply-btn').click();
    await waitForSave(page);
    const data = await getStoredData(page);
    // All slots for this teacher should now have groupId set
    const teacherSlots = data.slots.filter(s => s.teacherId === teacherId);
    for (const slot of teacherSlots) {
        expect(slot.studentGroupId).toBe(groupId);
    }
});
