import { test, expect } from '@playwright/test';
import { seedData, getStoredData, makeData } from './helpers.js';

test.beforeEach(async ({ page }) => {
    await seedData(page, makeData({ teachers: [{ name: 'Ms. Smith' }], groups: [], rooms: [], subjects: [] }));
    await page.click('#nav-setup');
});

// ── helpers ───────────────────────────────────────────────────────────────────

async function saveGroups(page, namesText) {
    await page.fill('#student-groups-input', namesText);
    await page.click('#save-student-groups-btn');
}

async function saveRooms(page, namesText) {
    await page.fill('#rooms-input', namesText);
    await page.click('#save-rooms-btn');
}

async function saveSubjects(page, namesText) {
    await page.fill('#subjects-input', namesText);
    await page.click('#save-subjects-btn');
}

// ── Student Groups ─────────────────────────────────────────────────────────────

test('save student groups stores them in localStorage', async ({ page }) => {
    await saveGroups(page, 'Class A\nClass B');
    const data = await getStoredData(page);
    const names = Object.values(data.studentGroups).map(g => g.name);
    expect(names).toContain('Class A');
    expect(names).toContain('Class B');
});

test('duplicate student group name shows error', async ({ page }) => {
    await saveGroups(page, 'Class A\nClass A');
    const error = page.locator('#student-groups-error');
    await expect(error).toHaveText(/duplicate/i);
});

test('save button shows confirmation feedback', async ({ page }) => {
    await saveGroups(page, 'Class A');
    const btn = page.locator('#save-student-groups-btn');
    await expect(btn).toHaveText(/saved/i);
});

test('removal warning appears when removing a referenced student group', async ({ page }) => {
    const data = makeData({
        periodCount: 1,
        teachers: [{ name: 'Ms. Smith' }],
        groups: [{ name: 'Class A' }],
        rooms: [],
        subjects: [],
    });
    data.slots[0].studentGroupId = '1';
    await seedData(page, data);
    await page.click('#nav-setup');

    let dialogShown = false;
    page.once('dialog', dialog => {
        dialogShown = true;
        dialog.dismiss();
    });

    await page.fill('#student-groups-input', '');
    await page.click('#save-student-groups-btn');
    expect(dialogShown).toBe(true);
});

test('cancelling removal warning leaves data unchanged', async ({ page }) => {
    const data = makeData({
        periodCount: 1,
        teachers: [{ name: 'Ms. Smith' }],
        groups: [{ name: 'Class A' }],
        rooms: [],
        subjects: [],
    });
    data.slots[0].studentGroupId = '1';
    await seedData(page, data);
    await page.click('#nav-setup');

    page.once('dialog', dialog => dialog.dismiss());
    await page.fill('#student-groups-input', '');
    await page.click('#save-student-groups-btn');

    const stored = await getStoredData(page);
    const names = Object.values(stored.studentGroups).map(g => g.name);
    expect(names).toContain('Class A');
});

test('confirming removal warning orphans slot references', async ({ page }) => {
    const data = makeData({
        periodCount: 1,
        teachers: [{ name: 'Ms. Smith' }],
        groups: [{ name: 'Class A' }],
        rooms: [],
        subjects: [],
    });
    data.slots[0].studentGroupId = '1';
    await seedData(page, data);
    await page.click('#nav-setup');

    page.once('dialog', dialog => dialog.accept());
    await page.fill('#student-groups-input', '');
    await page.click('#save-student-groups-btn');

    const stored = await getStoredData(page);
    expect(stored.slots[0].studentGroupId).toBeNull();
});

// ── Rooms ─────────────────────────────────────────────────────────────────────

test('save rooms stores them in localStorage', async ({ page }) => {
    await saveRooms(page, 'Room 101\nGym');
    const data = await getStoredData(page);
    const names = Object.values(data.rooms).map(r => r.name);
    expect(names).toContain('Room 101');
    expect(names).toContain('Gym');
});

test('duplicate room name shows error', async ({ page }) => {
    await saveRooms(page, 'Room 101\nRoom 101');
    const error = page.locator('#rooms-error');
    await expect(error).toHaveText(/duplicate/i);
});

test('cancelling removal warning leaves room data unchanged', async ({ page }) => {
    const data = makeData({
        periodCount: 1,
        teachers: [{ name: 'Ms. Smith' }],
        groups: [],
        rooms: [{ name: 'Room 101' }],
        subjects: [],
    });
    data.slots[0].roomId = '1';
    await seedData(page, data);
    await page.click('#nav-setup');

    page.once('dialog', dialog => dialog.dismiss());
    await page.fill('#rooms-input', '');
    await page.click('#save-rooms-btn');

    const stored = await getStoredData(page);
    const names = Object.values(stored.rooms).map(r => r.name);
    expect(names).toContain('Room 101');
});

// ── Subjects ──────────────────────────────────────────────────────────────────

test('save subjects stores them in localStorage', async ({ page }) => {
    await saveSubjects(page, 'Maths\nEnglish\nScience');
    const data = await getStoredData(page);
    const names = Object.values(data.subjects).map(s => s.name);
    expect(names).toContain('Maths');
    expect(names).toContain('English');
    expect(names).toContain('Science');
});

test('duplicate subject name shows error', async ({ page }) => {
    await saveSubjects(page, 'Maths\nMaths');
    const error = page.locator('#subjects-error');
    await expect(error).toHaveText(/duplicate/i);
});

test('cancelling removal warning leaves subject data unchanged', async ({ page }) => {
    const data = makeData({
        periodCount: 1,
        teachers: [{ name: 'Ms. Smith' }],
        groups: [],
        rooms: [],
        subjects: [{ name: 'Maths' }],
    });
    data.slots[0].subjectId = '1';
    await seedData(page, data);
    await page.click('#nav-setup');

    page.once('dialog', dialog => dialog.dismiss());
    await page.fill('#subjects-input', '');
    await page.click('#save-subjects-btn');

    const stored = await getStoredData(page);
    const names = Object.values(stored.subjects).map(s => s.name);
    expect(names).toContain('Maths');
});

// ── Textarea pre-population ───────────────────────────────────────────────────

test('existing entities are pre-populated in textarea on load', async ({ page }) => {
    const data = makeData({
        teachers: [{ name: 'Ms. Smith' }],
        groups: [{ name: 'Year 7A' }, { name: 'Year 7B' }],
        rooms: [],
        subjects: [],
    });
    await seedData(page, data);
    await page.click('#nav-setup');
    const val = await page.inputValue('#student-groups-input');
    expect(val).toContain('Year 7A');
    expect(val).toContain('Year 7B');
});
