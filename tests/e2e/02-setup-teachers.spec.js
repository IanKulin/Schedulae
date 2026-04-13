import { test, expect } from '@playwright/test';
import { clearStorage, seedData, getStoredData, makeData } from './helpers.js';

test.beforeEach(async ({ page }) => {
    await seedData(page, makeData({ teachers: [], groups: [], rooms: [], subjects: [] }));
    await page.click('#nav-setup');
});

test('single teacher appears in builder grid after save', async ({ page }) => {
    await page.fill('#teachers-input', 'Ms. Smith');
    await page.click('#save-teachers-btn');
    await page.click('#nav-builder');
    await expect(page.locator('#timetable-grid')).toContainText('Ms. Smith');
});

test('multi-line teachers all saved', async ({ page }) => {
    await page.fill('#teachers-input', 'Ms. Smith\nMr. Jones\nDr. Brown');
    await page.click('#save-teachers-btn');
    const data = await getStoredData(page);
    const names = Object.values(data.teachers).map(t => t.name);
    expect(names).toContain('Ms. Smith');
    expect(names).toContain('Mr. Jones');
    expect(names).toContain('Dr. Brown');
});

test('blank line is silently filtered (not an error)', async ({ page }) => {
    // The app filters out blank lines from the textarea
    await page.fill('#teachers-input', 'Ms. Smith\n\nMr. Jones');
    await page.click('#save-teachers-btn');
    const data = await getStoredData(page);
    const names = Object.values(data.teachers).map(t => t.name);
    // Both valid names should be saved
    expect(names).toContain('Ms. Smith');
    expect(names).toContain('Mr. Jones');
    // No error message
    const error = page.locator('#teachers-error');
    await expect(error).toHaveText('');
});

test('whitespace-only line treated as blank and filtered', async ({ page }) => {
    await page.fill('#teachers-input', 'Ms. Smith\n   \nMr. Jones');
    await page.click('#save-teachers-btn');
    const data = await getStoredData(page);
    const names = Object.values(data.teachers).map(t => t.name);
    expect(names).toContain('Ms. Smith');
    expect(names).toContain('Mr. Jones');
});

test('duplicate teacher name shows error', async ({ page }) => {
    await page.fill('#teachers-input', 'Ms. Smith\nMs. Smith');
    await page.click('#save-teachers-btn');
    const error = page.locator('#teachers-error');
    await expect(error).toHaveText(/duplicate/i);
});

test('special characters accepted', async ({ page }) => {
    await page.fill('#teachers-input', "O'Brien");
    await page.click('#save-teachers-btn');
    const data = await getStoredData(page);
    const names = Object.values(data.teachers).map(t => t.name);
    expect(names).toContain("O'Brien");
});

test('script tag displayed as text, not executed', async ({ page }) => {
    await page.fill('#teachers-input', '<script>alert(1)</script>');
    await page.click('#save-teachers-btn');
    const error = await page.locator('#teachers-error').textContent();
    if (!error || error.trim() === '') {
        await page.click('#nav-builder');
        const html = await page.locator('#timetable-grid').innerHTML();
        expect(html).not.toContain('<script>');
    }
});

test('leading/trailing spaces trimmed on save', async ({ page }) => {
    await page.fill('#teachers-input', '  Ms. Smith  ');
    await page.click('#save-teachers-btn');
    const data = await getStoredData(page);
    const names = Object.values(data.teachers).map(t => t.name);
    expect(names).toContain('Ms. Smith');
    expect(names).not.toContain('  Ms. Smith  ');
});

test('removing teacher from textarea removes column from grid', async ({ page }) => {
    // Add two teachers
    await page.fill('#teachers-input', 'Ms. Smith\nMr. Jones');
    await page.click('#save-teachers-btn');
    // Remove Mr. Jones - confirm the removal warning dialog (teacher has slots)
    page.once('dialog', dialog => dialog.accept());
    await page.fill('#teachers-input', 'Ms. Smith');
    await page.click('#save-teachers-btn');
    await page.click('#nav-builder');
    await expect(page.locator('#timetable-grid')).not.toContainText('Mr. Jones');
    await expect(page.locator('#timetable-grid')).toContainText('Ms. Smith');
});
