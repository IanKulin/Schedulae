import { test, expect } from '@playwright/test';
import { seedData, makeData } from './helpers.js';

test.beforeEach(async ({ page }) => {
    await seedData(page, makeData({ teachers: [], groups: [], rooms: [], subjects: [] }));
    await page.click('#nav-setup');
});

async function addEntity(page, listId, name) {
    const container = page.locator(`#${listId}`);
    await page.locator(`#${listId.replace(/-list$/, '-add-btn')} button.add-entity-btn`).click();
    const input = container.locator('input.entity-edit-input');
    await input.fill(name);
    await input.press('Enter');
}

test('script tag in entity name displayed as text, not executed', async ({ page }) => {
    const xss = '<script>alert(1)</script>';
    await addEntity(page, 'student-groups-list', xss);
    const html = await page.locator('#student-groups-list').innerHTML();
    expect(html).not.toContain('<script>');
    const text = await page.locator('#student-groups-list').textContent();
    expect(text).toContain('alert(1)');
});

test('img onerror tag displayed as text, not executed', async ({ page }) => {
    const xss = '<img src=x onerror=alert(1)>';
    await addEntity(page, 'student-groups-list', xss);
    const html = await page.locator('#student-groups-list').innerHTML();
    expect(html).not.toMatch(/<img [^>]*onerror/i);
});

test('unicode characters accepted and stored correctly', async ({ page }) => {
    await addEntity(page, 'student-groups-list', 'Élève (é, ñ, 中文)');
    const text = await page.locator('#student-groups-list').textContent();
    expect(text).toContain('Élève');
    expect(text).toContain('中文');
});

test('control characters rejected with error', async ({ page }) => {
    const container = page.locator('#student-groups-list');
    await page.locator('#student-groups-add-btn button.add-entity-btn').click();
    const input = container.locator('input.entity-edit-input');
    // Set control character value via evaluate
    await input.evaluate((el) => {
        el.value = 'Bad\x01Name';
        el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await container.locator('button[data-action="save-add"]').click();
    const error = page.locator('#student-groups-error');
    await expect(error).toHaveText(/invalid characters/i);
});
