import { test, expect } from '@playwright/test';
import { seedData, makeData } from './helpers.js';

test.beforeEach(async ({ page }) => {
    await seedData(page, makeData({
        periodCount: 2,
        teachers: [{ name: 'Ms. Smith' }],
        groups: [{ name: 'Class A' }],
        rooms: [],
        subjects: [],
    }));
});

test('Timetable Builder nav link shows builder page', async ({ page }) => {
    await page.click('#nav-setup');
    await page.click('#nav-builder');
    await expect(page.locator('#page-builder')).toBeVisible();
});

test('Setup nav link shows setup page', async ({ page }) => {
    await page.click('#nav-setup');
    await expect(page.locator('#page-setup')).toBeVisible();
});

test('Timetables nav link shows timetables page', async ({ page }) => {
    await page.click('#nav-timetables');
    await expect(page.locator('#page-timetables')).toBeVisible();
});

test('active page is highlighted in nav', async ({ page }) => {
    await page.click('#nav-setup');
    await expect(page.locator('#nav-setup')).toHaveClass(/nav-active/);
    await expect(page.locator('#nav-builder')).not.toHaveClass(/nav-active/);

    await page.click('#nav-builder');
    await expect(page.locator('#nav-builder')).toHaveClass(/nav-active/);
    await expect(page.locator('#nav-setup')).not.toHaveClass(/nav-active/);

    await page.click('#nav-timetables');
    await expect(page.locator('#nav-timetables')).toHaveClass(/nav-active/);
});

test('navigating to setup while in teacher edit shows setup page cleanly', async ({ page }) => {
    // Enter teacher edit mode
    await page.locator('span.teacher-header-name:has-text("Ms. Smith")').click();
    await expect(page.locator('input.teacher-edit-input')).toBeVisible();
    // Navigate to setup
    await page.click('#nav-setup');
    // Setup page should be shown without stale builder inputs
    await expect(page.locator('#page-setup')).toBeVisible();
    await expect(page.locator('#page-builder')).not.toBeVisible();
});

test('individual timetable back link returns to timetables', async ({ page }) => {
    await page.click('#nav-timetables');
    await page.locator('#section-teachers summary').click();
    await page.locator('#teachers-timetable-list .timetable-entity-link').first().click();
    await expect(page.locator('#page-individual-timetable')).toBeVisible();
    await page.locator('#page-individual-timetable a').first().click();
    await expect(page.locator('#page-timetables')).toBeVisible();
});
