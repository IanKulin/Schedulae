import { test, expect } from '@playwright/test';
import { clearStorage, seedData, getStoredData, makeData } from './helpers.js';

test.beforeEach(async ({ page }) => {
    await seedData(page, makeData({ teachers: [{ name: 'Ms. Smith' }], groups: [], rooms: [], subjects: [] }));
    await page.click('#nav-setup');
});

async function addEntity(page, listId, name) {
    const container = page.locator(`#${listId}`);
    await container.locator('button.add-entity-btn').click();
    const input = container.locator('input.entity-edit-input');
    await input.fill(name);
    await input.press('Enter');
}

test('click + Add shows input', async ({ page }) => {
    const container = page.locator('#student-groups-list');
    await container.locator('button.add-entity-btn').click();
    await expect(container.locator('input.entity-edit-input')).toBeVisible();
});

test('type name and press Enter saves entity', async ({ page }) => {
    await addEntity(page, 'student-groups-list', 'Class A');
    const data = await getStoredData(page);
    const names = Object.values(data.studentGroups).map(g => g.name);
    expect(names).toContain('Class A');
});

test('type name and click Save saves entity', async ({ page }) => {
    const container = page.locator('#student-groups-list');
    await container.locator('button.add-entity-btn').click();
    const input = container.locator('input.entity-edit-input');
    await input.fill('Class B');
    await container.locator('button[data-action="save-add"]').click();
    const data = await getStoredData(page);
    const names = Object.values(data.studentGroups).map(g => g.name);
    expect(names).toContain('Class B');
});

test('click Cancel does not save', async ({ page }) => {
    const container = page.locator('#student-groups-list');
    await container.locator('button.add-entity-btn').click();
    const input = container.locator('input.entity-edit-input');
    await input.fill('Cancelled Group');
    await container.locator('button[data-action="cancel-add"]').click();
    const data = await getStoredData(page);
    const names = Object.values(data.studentGroups || {}).map(g => g.name);
    expect(names).not.toContain('Cancelled Group');
});

test('press Escape cancels add', async ({ page }) => {
    const container = page.locator('#student-groups-list');
    await container.locator('button.add-entity-btn').click();
    const input = container.locator('input.entity-edit-input');
    await input.fill('Escaped Group');
    await input.press('Escape');
    const data = await getStoredData(page);
    const names = Object.values(data.studentGroups || {}).map(g => g.name);
    expect(names).not.toContain('Escaped Group');
});

test('blank name shows error', async ({ page }) => {
    const container = page.locator('#student-groups-list');
    await container.locator('button.add-entity-btn').click();
    await container.locator('button[data-action="save-add"]').click();
    const error = page.locator('#student-groups-error');
    await expect(error).toHaveText(/cannot be blank/i);
});

test('duplicate name shows error', async ({ page }) => {
    await addEntity(page, 'student-groups-list', 'Class A');
    const container = page.locator('#student-groups-list');
    await container.locator('button.add-entity-btn').click();
    const input = container.locator('input.entity-edit-input');
    await input.fill('Class A');
    await input.press('Enter');
    const error = page.locator('#student-groups-error');
    await expect(error).toHaveText(/duplicate/i);
});

test('click Edit shows input with current name', async ({ page }) => {
    await addEntity(page, 'student-groups-list', 'Class A');
    const container = page.locator('#student-groups-list');
    await container.locator('button[data-action="edit"]').first().click();
    const input = container.locator('input.entity-edit-input');
    await expect(input).toBeVisible();
    await expect(input).toHaveValue('Class A');
});

test('rename entity and save updates stored name', async ({ page }) => {
    await addEntity(page, 'student-groups-list', 'Class A');
    const container = page.locator('#student-groups-list');
    await container.locator('button[data-action="edit"]').first().click();
    const input = container.locator('input.entity-edit-input');
    await input.fill('Class Renamed');
    await input.press('Enter');
    const data = await getStoredData(page);
    const names = Object.values(data.studentGroups).map(g => g.name);
    expect(names).toContain('Class Renamed');
    expect(names).not.toContain('Class A');
});

test('cancel edit reverts to original name', async ({ page }) => {
    await addEntity(page, 'student-groups-list', 'Class A');
    const container = page.locator('#student-groups-list');
    await container.locator('button[data-action="edit"]').first().click();
    const input = container.locator('input.entity-edit-input');
    await input.fill('Changed Name');
    await container.locator('button[data-action="cancel-edit"]').click();
    await expect(container).toContainText('Class A');
});

test('Escape during edit reverts', async ({ page }) => {
    await addEntity(page, 'student-groups-list', 'Class A');
    const container = page.locator('#student-groups-list');
    await container.locator('button[data-action="edit"]').first().click();
    const input = container.locator('input.entity-edit-input');
    await input.fill('New Name');
    await input.press('Escape');
    await expect(container).toContainText('Class A');
});

test('delete unused entity shows confirmation', async ({ page }) => {
    await addEntity(page, 'student-groups-list', 'Class A');
    const container = page.locator('#student-groups-list');
    let dialogShown = false;
    page.once('dialog', dialog => {
        dialogShown = true;
        dialog.dismiss();
    });
    await container.locator('button[data-action="delete"]').first().click();
    expect(dialogShown).toBe(true);
});

test('cancel deletion leaves entity intact', async ({ page }) => {
    await addEntity(page, 'student-groups-list', 'Class A');
    const container = page.locator('#student-groups-list');
    page.once('dialog', dialog => dialog.dismiss());
    await container.locator('button[data-action="delete"]').first().click();
    await expect(container).toContainText('Class A');
});

test('confirm deletion removes entity from storage', async ({ page }) => {
    await addEntity(page, 'student-groups-list', 'Class A');
    const container = page.locator('#student-groups-list');
    page.once('dialog', dialog => dialog.accept());
    await container.locator('button[data-action="delete"]').first().click();
    const data = await getStoredData(page);
    const names = Object.values(data.studentGroups || {}).map(g => g.name);
    expect(names).not.toContain('Class A');
});

test('empty section shows placeholder text', async ({ page }) => {
    await expect(page.locator('#rooms-list')).toContainText(/no items/i);
});
