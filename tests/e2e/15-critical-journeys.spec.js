import { test, expect } from '@playwright/test';
import { clearStorage, seedData, getStoredData, waitForSave, makeData } from './helpers.js';
import fs from 'fs';

test('full workflow: setup → fill → conflict → resolve → export → import', async ({ page }) => {
    // 1. Start fresh
    await clearStorage(page);
    // 2. Create timetable with 2 periods
    await page.fill('#initial-periods', '2');
    await page.click('#create-timetable-btn');
    // 3. Add 2 teachers
    await page.fill('#teachers-input', 'Ms. Smith\nMr. Jones');
    await page.click('#save-teachers-btn');
    // 4. Add student group, room, subject
    await page.fill('#student-groups-input', 'Class A');
    await page.click('#save-student-groups-btn');
    await page.fill('#rooms-input', 'Room 1');
    await page.click('#save-rooms-btn');
    await page.fill('#subjects-input', 'Maths');
    await page.click('#save-subjects-btn');
    // 5. Go to builder and fill some cells
    await page.click('#nav-builder');
    const groupDropdowns = page.locator('select.cell-dropdown[data-field="studentGroupId"]');
    await groupDropdowns.nth(0).selectOption('1');
    await waitForSave(page);
    // 6. Create conflict: assign same group to Teacher2 Mon P1
    await groupDropdowns.nth(1).selectOption('1');
    await waitForSave(page);
    await expect(page.locator('.cell-conflict')).toHaveCount(2);
    // 7. Resolve conflict
    await groupDropdowns.nth(1).selectOption('');
    await waitForSave(page);
    await expect(page.locator('.cell-conflict')).toHaveCount(0);
    // 8. Export
    await page.click('#nav-setup');
    const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('#save-file-button'),
    ]);
    const exportPath = await download.path();
    const exported = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));
    expect(Object.keys(exported.teachers).length).toBe(2);
    // 9. Import exported data (with existing data, dialog will appear)
    page.once('dialog', dialog => dialog.accept());
    const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.click('#load-file-button'),
    ]);
    await fileChooser.setFiles({
        name: 'timetable.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(exported)),
    });
    await page.waitForTimeout(500);
    const restored = await getStoredData(page);
    expect(Object.keys(restored.teachers).length).toBe(2);
});

test('period change: increase then decrease preserves/removes data correctly', async ({ page }) => {
    await seedData(page, makeData({ periodCount: 4, teachers: [{ name: 'Ms. Smith' }], groups: [], rooms: [], subjects: [] }));
    await page.click('#nav-setup');
    // Increase to 6
    await page.fill('#periods-input', '6');
    await page.click('#save-periods-btn');
    let data = await getStoredData(page);
    expect(data.periods).toHaveLength(6);
    // Decrease to 4
    page.once('dialog', dialog => dialog.accept());
    await page.fill('#periods-input', '4');
    await page.click('#save-periods-btn');
    data = await getStoredData(page);
    expect(data.periods).toHaveLength(4);
    const slotsForP5 = data.slots.filter(s => s.period === 5);
    expect(slotsForP5).toHaveLength(0);
    const slotsForP1 = data.slots.filter(s => s.period === 1);
    expect(slotsForP1.length).toBeGreaterThan(0);
});

test('teacher rename and delete propagates correctly', async ({ page }) => {
    await seedData(page, makeData({ periodCount: 1, teachers: [{ name: 'Ms. Smith' }], groups: [], rooms: [], subjects: [] }));
    // Rename via builder
    await page.locator('span.teacher-header-name:has-text("Ms. Smith")').click();
    const input = page.locator('input.teacher-edit-input');
    await input.fill('Mrs. Brown');
    await input.press('Enter');
    await expect(page.locator('#timetable-grid')).toContainText('Mrs. Brown');
    // Check timetables view
    await page.click('#nav-timetables');
    await page.locator('#section-teachers summary').click();
    await expect(page.locator('#teachers-timetable-list')).toContainText('Mrs. Brown');
    // Delete the teacher
    await page.click('#nav-builder');
    await page.locator('span.teacher-header-name:has-text("Mrs. Brown")').click();
    page.once('dialog', dialog => dialog.accept());
    await page.locator('button.teacher-edit-trash').click();
    const data = await getStoredData(page);
    expect(Object.keys(data.teachers)).toHaveLength(0);
    expect(data.slots).toHaveLength(0);
});
