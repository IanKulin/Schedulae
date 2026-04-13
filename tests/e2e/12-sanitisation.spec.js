import { test, expect } from '@playwright/test';
import { seedData, getStoredData, makeData } from './helpers.js';

test.beforeEach(async ({ page }) => {
    await seedData(page, makeData({ teachers: [], groups: [], rooms: [], subjects: [] }));
    await page.click('#nav-setup');
});

async function saveGroups(page, namesText) {
    await page.fill('#student-groups-input', namesText);
    await page.click('#save-student-groups-btn');
}

test('script tag in entity name stored as text, not executed', async ({ page }) => {
    const xss = '<script>alert(1)</script>';
    await saveGroups(page, xss);
    const data = await getStoredData(page);
    const names = Object.values(data.studentGroups).map(g => g.name);
    expect(names).toContain(xss);
    // Verify no script executed (if it had, the page title would change or an alert would fire)
    await expect(page).toHaveTitle(/schedulae/i);
});

test('img onerror tag stored as text, not executed', async ({ page }) => {
    const xss = '<img src=x onerror=alert(1)>';
    await saveGroups(page, xss);
    const data = await getStoredData(page);
    const names = Object.values(data.studentGroups).map(g => g.name);
    expect(names).toContain(xss);
});

test('unicode characters accepted and stored correctly', async ({ page }) => {
    await saveGroups(page, 'Élève (é, ñ, 中文)');
    const data = await getStoredData(page);
    const names = Object.values(data.studentGroups).map(g => g.name);
    expect(names).toContain('Élève (é, ñ, 中文)');
});

test('control characters rejected with error', async ({ page }) => {
    // Set control character value via evaluate since fill() strips them
    await page.evaluate(() => {
        document.querySelector('#student-groups-input').value = 'Bad\x01Name';
    });
    await page.click('#save-student-groups-btn');
    const error = page.locator('#student-groups-error');
    await expect(error).toHaveText(/invalid characters/i);
});
