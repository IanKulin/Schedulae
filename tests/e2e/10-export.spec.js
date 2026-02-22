import { test, expect } from '@playwright/test';
import { seedData, makeData, waitForSave } from './helpers.js';
import fs from 'fs';

test.beforeEach(async ({ page }) => {
    await seedData(page, makeData({
        periodCount: 2,
        teachers: [{ name: 'Ms. Smith' }],
        groups: [{ name: 'Class A' }],
        rooms: [{ name: 'Room 1' }],
        subjects: [{ name: 'Maths' }],
    }));
    await page.click('#nav-setup');
});

test('clicking Download triggers a file download', async ({ page }) => {
    const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('#save-file-button'),
    ]);
    expect(download).toBeDefined();
});

test('downloaded filename matches expected pattern', async ({ page }) => {
    const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('#save-file-button'),
    ]);
    expect(download.suggestedFilename()).toMatch(/^schedulae-timetable-\d{4}-\d{2}-\d{2}\.json$/);
});

test('downloaded file is valid JSON', async ({ page }) => {
    const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('#save-file-button'),
    ]);
    const path = await download.path();
    const content = fs.readFileSync(path, 'utf-8');
    expect(() => JSON.parse(content)).not.toThrow();
});

test('downloaded file contains all entities', async ({ page }) => {
    const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('#save-file-button'),
    ]);
    const path = await download.path();
    const data = JSON.parse(fs.readFileSync(path, 'utf-8'));
    expect(Object.keys(data.teachers).length).toBeGreaterThan(0);
    expect(Object.keys(data.studentGroups).length).toBeGreaterThan(0);
    expect(Object.keys(data.rooms).length).toBeGreaterThan(0);
    expect(Object.keys(data.subjects).length).toBeGreaterThan(0);
    expect(data.periods.length).toBeGreaterThan(0);
    expect(Array.isArray(data.slots)).toBe(true);
});

test('export empty timetable produces valid file with empty collections', async ({ page }) => {
    const empty = makeData({ teachers: [], groups: [], rooms: [], subjects: [], periodCount: 2 });
    await seedData(page, empty);
    await page.click('#nav-setup');
    const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('#save-file-button'),
    ]);
    const path = await download.path();
    const data = JSON.parse(fs.readFileSync(path, 'utf-8'));
    expect(Object.keys(data.teachers)).toHaveLength(0);
    expect(Array.isArray(data.slots)).toBe(true);
});

test('export filled timetable contains all assignments', async ({ page }) => {
    // Fill a slot via builder then export
    await page.click('#nav-builder');
    await page.locator('select.cell-dropdown[data-field="studentGroupId"]').first().selectOption('1');
    await waitForSave(page);
    await page.click('#nav-setup');
    const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('#save-file-button'),
    ]);
    const path = await download.path();
    const data = JSON.parse(fs.readFileSync(path, 'utf-8'));
    const filledSlot = data.slots.find(s => s.studentGroupId === '1');
    expect(filledSlot).toBeDefined();
});
