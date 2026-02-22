import { test, expect } from '@playwright/test';
import { seedData, getStoredData, makeData } from './helpers.js';

test.beforeEach(async ({ page }) => {
    await seedData(page, makeData({ periodCount: 6 }));
    await page.click('#nav-setup');
});

test('increasing periods creates new empty slots', async ({ page }) => {
    await page.fill('#periods-input', '8');
    await page.click('#save-periods-btn');
    const data = await getStoredData(page);
    expect(data.periods).toHaveLength(8);
    // Slots for the new periods should exist
    const slotsForP7 = data.slots.filter(s => s.period === 7);
    expect(slotsForP7.length).toBeGreaterThan(0);
});

test('decreasing periods shows confirmation dialog', async ({ page }) => {
    let dialogShown = false;
    page.once('dialog', dialog => {
        dialogShown = true;
        dialog.dismiss();
    });
    await page.fill('#periods-input', '4');
    await page.click('#save-periods-btn');
    expect(dialogShown).toBe(true);
});

test('cancelling decrease leaves period count unchanged', async ({ page }) => {
    page.once('dialog', dialog => dialog.dismiss());
    await page.fill('#periods-input', '4');
    await page.click('#save-periods-btn');
    const data = await getStoredData(page);
    expect(data.periods).toHaveLength(6);
});

test('confirming decrease removes periods and their slots', async ({ page }) => {
    page.once('dialog', dialog => dialog.accept());
    await page.fill('#periods-input', '4');
    await page.click('#save-periods-btn');
    const data = await getStoredData(page);
    expect(data.periods).toHaveLength(4);
    const slotsForP5 = data.slots.filter(s => s.period === 5);
    expect(slotsForP5).toHaveLength(0);
});

test('cannot set periods below 1', async ({ page }) => {
    await page.fill('#periods-input', '0');
    await page.click('#save-periods-btn');
    const error = page.locator('#periods-error');
    await expect(error).toBeVisible();
});

test('cannot set periods above 20', async ({ page }) => {
    await page.fill('#periods-input', '21');
    await page.click('#save-periods-btn');
    const error = page.locator('#periods-error');
    await expect(error).toBeVisible();
});
