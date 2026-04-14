import { test, expect } from '@playwright/test';
import { clearStorage, getStoredData } from './helpers.js';

test.beforeEach(async ({ page }) => {
    await clearStorage(page);
});

test('shows setup page when storage is empty', async ({ page }) => {
    await expect(page.locator('#first-time-setup')).toBeVisible();
    await expect(page.locator('#editing-section')).not.toBeVisible();
});

test('enters valid period count and creates timetable', async ({ page }) => {
    await page.fill('#initial-periods', '6');
    await page.click('#create-timetable-btn');
    await expect(page.locator('#editing-section')).toBeVisible();
    await expect(page.locator('#first-time-setup')).not.toBeVisible();
    const data = await getStoredData(page);
    expect(data).not.toBeNull();
    expect(data.periods).toHaveLength(6);
});

test('shows error for period count of 0', async ({ page }) => {
    await page.fill('#initial-periods', '0');
    await page.click('#create-timetable-btn');
    const error = page.locator('#initial-periods-error');
    await expect(error).not.toHaveText('');
});

test('shows error for negative period count', async ({ page }) => {
    await page.fill('#initial-periods', '-1');
    await page.click('#create-timetable-btn');
    const error = page.locator('#initial-periods-error');
    await expect(error).not.toHaveText('');
});

test('shows error for period count above 20', async ({ page }) => {
    await page.fill('#initial-periods', '21');
    await page.click('#create-timetable-btn');
    const error = page.locator('#initial-periods-error');
    await expect(error).not.toHaveText('');
});

test('period count of 20 is accepted', async ({ page }) => {
    await page.fill('#initial-periods', '20');
    await page.click('#create-timetable-btn');
    await expect(page.locator('#editing-section')).toBeVisible();
    const data = await getStoredData(page);
    expect(data.periods).toHaveLength(20);
});

test('shows error for non-numeric period count', async ({ page }) => {
    // Set a non-numeric value directly on the number input
    await page.evaluate(() => { document.querySelector('#initial-periods').value = ''; });
    await page.click('#create-timetable-btn');
    const error = page.locator('#initial-periods-error');
    await expect(error).not.toHaveText('');
});

test('shows error when period field is blank', async ({ page }) => {
    await page.evaluate(() => { document.querySelector('#initial-periods').value = ''; });
    await page.click('#create-timetable-btn');
    const error = page.locator('#initial-periods-error');
    await expect(error).not.toHaveText('');
});

test('decimal period count is truncated to integer', async ({ page }) => {
    await page.fill('#initial-periods', '5');
    await page.evaluate(() => {
        // Simulate a decimal that parseInt truncates
        document.querySelector('#initial-periods').value = '5.9';
    });
    await page.click('#create-timetable-btn');
    const data = await getStoredData(page);
    expect(data).not.toBeNull();
    expect(data.periods).toHaveLength(5);
});

test('period count persists after reload', async ({ page }) => {
    await page.fill('#initial-periods', '4');
    await page.click('#create-timetable-btn');
    await page.reload();
    const data = await getStoredData(page);
    expect(data.periods).toHaveLength(4);
});
