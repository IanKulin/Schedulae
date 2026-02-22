import { test, expect } from '@playwright/test';
import { seedData, clearStorage, getStoredData, makeData } from './helpers.js';

const validExport = JSON.stringify(makeData({
    periodCount: 2,
    teachers: [{ name: 'Imported Teacher' }],
    groups: [{ name: 'Imported Group' }],
    rooms: [{ name: 'Imported Room' }],
    subjects: [{ name: 'Imported Subject' }],
}));

test.beforeEach(async ({ page }) => {
    await seedData(page, makeData({ periodCount: 2, teachers: [{ name: 'Ms. Smith' }], groups: [], rooms: [], subjects: [] }));
    await page.click('#nav-setup');
});

test('clicking Import triggers file picker', async ({ page }) => {
    const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.click('#load-file-button'),
    ]);
    expect(fileChooser).toBeDefined();
});

test('valid JSON import shows confirm dialog when data exists', async ({ page }) => {
    let dialogShown = false;
    page.once('dialog', dialog => {
        dialogShown = true;
        dialog.dismiss();
    });
    const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.click('#load-file-button'),
    ]);
    await fileChooser.setFiles({
        name: 'timetable.json',
        mimeType: 'application/json',
        buffer: Buffer.from(validExport),
    });
    await page.waitForTimeout(500);
    expect(dialogShown).toBe(true);
});

test('cancel import confirm leaves data unchanged', async ({ page }) => {
    const beforeData = await getStoredData(page);
    page.once('dialog', dialog => dialog.dismiss());
    const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.click('#load-file-button'),
    ]);
    await fileChooser.setFiles({
        name: 'timetable.json',
        mimeType: 'application/json',
        buffer: Buffer.from(validExport),
    });
    await page.waitForTimeout(500);
    const afterData = await getStoredData(page);
    expect(JSON.stringify(afterData)).toBe(JSON.stringify(beforeData));
});

test('confirm import replaces localStorage data', async ({ page }) => {
    page.once('dialog', dialog => dialog.accept());
    const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.click('#load-file-button'),
    ]);
    await fileChooser.setFiles({
        name: 'timetable.json',
        mimeType: 'application/json',
        buffer: Buffer.from(validExport),
    });
    await page.waitForTimeout(500);
    const data = await getStoredData(page);
    const names = Object.values(data.teachers).map(t => t.name);
    expect(names).toContain('Imported Teacher');
});

test('import replaces data and re-renders the page', async ({ page }) => {
    // After import, the page re-initializes with the imported data
    page.once('dialog', dialog => dialog.accept());
    const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.click('#load-file-button'),
    ]);
    await fileChooser.setFiles({
        name: 'timetable.json',
        mimeType: 'application/json',
        buffer: Buffer.from(validExport),
    });
    await page.waitForTimeout(500);
    // Page re-renders showing imported teacher in the teachers textarea
    await expect(page.locator('#teachers-input')).toHaveValue(/Imported Teacher/);
});

test('invalid JSON file shows error message', async ({ page }) => {
    // With existing data, a dialog appears. Accept it, then the invalid JSON shows error.
    page.once('dialog', dialog => dialog.accept());
    const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.click('#load-file-button'),
    ]);
    await fileChooser.setFiles({
        name: 'bad.json',
        mimeType: 'application/json',
        buffer: Buffer.from('not valid json {{{'),
    });
    await page.waitForTimeout(500);
    await expect(page.locator('#file-status')).not.toHaveText('');
});

test('missing required fields in JSON shows error', async ({ page }) => {
    const badData = JSON.stringify({ foo: 'bar' });
    page.once('dialog', dialog => dialog.accept());
    const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.click('#load-file-button'),
    ]);
    await fileChooser.setFiles({
        name: 'bad.json',
        mimeType: 'application/json',
        buffer: Buffer.from(badData),
    });
    await page.waitForTimeout(500);
    await expect(page.locator('#file-status')).not.toHaveText('');
});

test('imported data persists after reload', async ({ page }) => {
    page.once('dialog', dialog => dialog.accept());
    const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.click('#load-file-button'),
    ]);
    await fileChooser.setFiles({
        name: 'timetable.json',
        mimeType: 'application/json',
        buffer: Buffer.from(validExport),
    });
    await page.waitForTimeout(500);
    await page.reload();
    const data = await getStoredData(page);
    const names = Object.values(data.teachers).map(t => t.name);
    expect(names).toContain('Imported Teacher');
});
