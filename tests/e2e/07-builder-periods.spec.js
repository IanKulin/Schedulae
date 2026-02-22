import { test, expect } from '@playwright/test';
import { seedData, getStoredData, makeData } from './helpers.js';

test.beforeEach(async ({ page }) => {
    await seedData(page, makeData({
        periodCount: 3,
        teachers: [{ name: 'Ms. Smith' }],
        groups: [],
        rooms: [],
        subjects: [],
    }));
});

async function clickPeriodLabel(page, periodName) {
    // Period labels are shown only on the first day's row headers
    await page.locator(`span.period-label-editable`).filter({ hasText: periodName }).first().click();
}

test('clicking period label enters edit mode', async ({ page }) => {
    await clickPeriodLabel(page, 'P1');
    await expect(page.locator('input.period-edit-input')).toBeVisible();
});

test('rename period and press Enter saves and updates grid', async ({ page }) => {
    await clickPeriodLabel(page, 'P1');
    const input = page.locator('input.period-edit-input');
    await input.fill('Morning');
    await input.press('Enter');
    await expect(page.locator('#timetable-grid')).toContainText('Morning');
    const data = await getStoredData(page);
    const period = data.periods.find(p => p.id === 1);
    expect(period.name).toBe('Morning');
});

test('press Escape reverts period name', async ({ page }) => {
    await clickPeriodLabel(page, 'P1');
    const input = page.locator('input.period-edit-input');
    await input.fill('Changed');
    await input.press('Escape');
    await expect(page.locator('#timetable-grid')).toContainText('P1');
});

test('save empty period name shows error via alert', async ({ page }) => {
    await clickPeriodLabel(page, 'P1');
    const input = page.locator('input.period-edit-input');
    await input.fill('');
    // Empty name triggers an alert and keeps edit mode
    page.once('dialog', dialog => dialog.accept());
    await input.press('Enter');
    // Still in edit mode
    await expect(page.locator('input.period-edit-input')).toBeVisible();
});

test('custom period name shows in timetables view', async ({ page }) => {
    await clickPeriodLabel(page, 'P1');
    const input = page.locator('input.period-edit-input');
    await input.fill('Lunch');
    await input.press('Enter');
    await page.click('#nav-timetables');
    await page.locator('#section-teachers summary').click();
    await page.locator('#teachers-timetable-list a').first().click();
    await expect(page.locator('#page-individual-timetable')).toContainText('Lunch');
});
