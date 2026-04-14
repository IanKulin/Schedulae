import { test, expect } from '@playwright/test';
import { seedData, makeData } from './helpers.js';

test.beforeEach(async ({ page }) => {
    const data = makeData({
        periodCount: 2,
        teachers: [{ name: 'Ms. Smith' }],
        groups: [{ name: 'Class A' }],
        rooms: [{ name: 'Room 1' }],
        subjects: [{ name: 'Maths' }],
    });
    await seedData(page, data);
    await page.click('#nav-timetables');
});

test('three sections are collapsed on load', async ({ page }) => {
    await expect(page.locator('#section-teachers')).not.toHaveAttribute('open');
    await expect(page.locator('#section-student-groups')).not.toHaveAttribute('open');
    await expect(page.locator('#section-rooms')).not.toHaveAttribute('open');
});

test('clicking section header expands it', async ({ page }) => {
    await page.locator('#section-teachers summary').click();
    await expect(page.locator('#section-teachers')).toHaveAttribute('open', '');
});

test('clicking expanded section header collapses it', async ({ page }) => {
    await page.locator('#section-teachers summary').click();
    await page.locator('#section-teachers summary').click();
    await expect(page.locator('#section-teachers')).not.toHaveAttribute('open');
});

test('empty section shows placeholder with Setup link', async ({ page }) => {
    const data = makeData({ teachers: [], groups: [], rooms: [], subjects: [] });
    await seedData(page, data);
    await page.click('#nav-timetables');
    await page.locator('#section-teachers summary').click();
    await expect(page.locator('#teachers-timetable-list')).toContainText(/setup/i);
});

test('Setup link in empty section navigates to Setup', async ({ page }) => {
    const data = makeData({ teachers: [], groups: [], rooms: [], subjects: [] });
    await seedData(page, data);
    await page.click('#nav-timetables');
    await page.locator('#section-teachers summary').click();
    await page.locator('#teachers-timetable-list .go-to-setup-link').click();
    await expect(page.locator('#page-setup')).toBeVisible();
});

test('clicking entity name shows individual timetable', async ({ page }) => {
    await page.locator('#section-teachers summary').click();
    await page.locator('#teachers-timetable-list .timetable-entity-link').first().click();
    await expect(page.locator('#page-individual-timetable')).toBeVisible();
});

test('teacher timetable shows Class, Room, Subject labels in filled cells', async ({ page }) => {
    // Seed data with a filled slot so labels are visible
    const data = makeData({
        periodCount: 1,
        teachers: [{ name: 'Ms. Smith' }],
        groups: [{ name: 'Class A' }],
        rooms: [{ name: 'Room 1' }],
        subjects: [{ name: 'Maths' }],
    });
    data.slots[0].studentGroupId = '1';
    data.slots[0].roomId = '1';
    data.slots[0].subjectId = '1';
    await seedData(page, data);
    await page.click('#nav-timetables');
    await page.locator('#section-teachers summary').click();
    await page.locator('#teachers-timetable-list .timetable-entity-link').first().click();
    const labels = page.locator('#page-individual-timetable .cell-label');
    await expect(labels.filter({ hasText: 'Class:' })).toHaveCount(1);
    await expect(labels.filter({ hasText: 'Room:' })).toHaveCount(1);
    await expect(labels.filter({ hasText: 'Subject:' })).toHaveCount(1);
});

test('student group timetable shows Teacher, Room, Subject labels in filled cells', async ({ page }) => {
    const data = makeData({
        periodCount: 1,
        teachers: [{ name: 'Ms. Smith' }],
        groups: [{ name: 'Class A' }],
        rooms: [{ name: 'Room 1' }],
        subjects: [{ name: 'Maths' }],
    });
    data.slots[0].studentGroupId = '1';
    data.slots[0].roomId = '1';
    data.slots[0].subjectId = '1';
    await seedData(page, data);
    await page.click('#nav-timetables');
    await page.locator('#section-student-groups summary').click();
    await page.locator('#student-groups-timetable-list .timetable-entity-link').first().click();
    const labels = page.locator('#page-individual-timetable .cell-label');
    await expect(labels.filter({ hasText: 'Teacher:' })).toHaveCount(1);
    await expect(labels.filter({ hasText: 'Room:' })).toHaveCount(1);
    await expect(labels.filter({ hasText: 'Subject:' })).toHaveCount(1);
});

test('room timetable shows Teacher, Class, Subject labels in filled cells', async ({ page }) => {
    const data = makeData({
        periodCount: 1,
        teachers: [{ name: 'Ms. Smith' }],
        groups: [{ name: 'Class A' }],
        rooms: [{ name: 'Room 1' }],
        subjects: [{ name: 'Maths' }],
    });
    data.slots[0].studentGroupId = '1';
    data.slots[0].roomId = '1';
    data.slots[0].subjectId = '1';
    await seedData(page, data);
    await page.click('#nav-timetables');
    await page.locator('#section-rooms summary').click();
    await page.locator('#rooms-timetable-list .timetable-entity-link').first().click();
    const labels = page.locator('#page-individual-timetable .cell-label');
    await expect(labels.filter({ hasText: 'Teacher:' })).toHaveCount(1);
    await expect(labels.filter({ hasText: 'Class:' })).toHaveCount(1);
    await expect(labels.filter({ hasText: 'Subject:' })).toHaveCount(1);
});

test('individual timetable grid has days across the top and periods down the side', async ({ page }) => {
    await page.locator('#section-teachers summary').click();
    await page.locator('#teachers-timetable-list .timetable-entity-link').first().click();
    const grid = page.locator('#individual-timetable-grid');
    // Day headers should appear in the first row (after the corner cell)
    const dayHeaders = grid.locator('.individual-grid-header');
    await expect(dayHeaders).toHaveCount(5);
    const headerTexts = await dayHeaders.allTextContents();
    expect(headerTexts).toEqual(expect.arrayContaining(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']));
    // Period row headers should appear down the side — one per period
    const periodHeaders = grid.locator('.individual-grid-row-header');
    await expect(periodHeaders).toHaveCount(2); // beforeEach uses periodCount: 2
});

test('back link returns to timetables page', async ({ page }) => {
    await page.locator('#section-teachers summary').click();
    await page.locator('#teachers-timetable-list .timetable-entity-link').first().click();
    await page.locator('#page-individual-timetable a').first().click();
    await expect(page.locator('#page-timetables')).toBeVisible();
});

test('custom period names shown in individual timetable', async ({ page }) => {
    await page.click('#nav-builder');
    await page.locator('span.period-label-editable').filter({ hasText: 'P1' }).first().click();
    const input = page.locator('input.period-edit-input');
    await input.fill('Lunch');
    await input.press('Enter');
    await page.click('#nav-timetables');
    await page.locator('#section-teachers summary').click();
    await page.locator('#teachers-timetable-list .timetable-entity-link').first().click();
    await expect(page.locator('#page-individual-timetable')).toContainText('Lunch');
});
