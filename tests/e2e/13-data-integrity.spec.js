import { test, expect } from '@playwright/test';
import { seedData, getStoredData, makeData } from './helpers.js';

test('deleting student group nulls studentGroupId in slots', async ({ page }) => {
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
    expect(stored.slots.length).toBeGreaterThan(0);
    const slot = stored.slots.find(s => s.id === data.slots[0].id);
    expect(slot.studentGroupId).toBeNull();
});

test('deleting room nulls roomId in slots', async ({ page }) => {
    const data = makeData({
        periodCount: 1,
        teachers: [{ name: 'Ms. Smith' }],
        groups: [],
        rooms: [{ name: 'Room 1' }],
        subjects: [],
    });
    data.slots[0].roomId = '1';
    await seedData(page, data);
    await page.click('#nav-setup');
    page.once('dialog', dialog => dialog.accept());
    await page.fill('#rooms-input', '');
    await page.click('#save-rooms-btn');
    const stored = await getStoredData(page);
    const slot = stored.slots.find(s => s.id === data.slots[0].id);
    expect(slot.roomId).toBeNull();
});

test('deleting subject nulls subjectId in slots', async ({ page }) => {
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
    page.once('dialog', dialog => dialog.accept());
    await page.fill('#subjects-input', '');
    await page.click('#save-subjects-btn');
    const stored = await getStoredData(page);
    const slot = stored.slots.find(s => s.id === data.slots[0].id);
    expect(slot.subjectId).toBeNull();
});

test('deleting teacher removes all teacher slots', async ({ page }) => {
    await seedData(page, makeData({
        periodCount: 2,
        teachers: [{ name: 'Ms. Smith' }],
        groups: [],
        rooms: [],
        subjects: [],
    }));
    await page.locator('span.teacher-header-name:has-text("Ms. Smith")').click();
    page.once('dialog', dialog => dialog.accept());
    await page.locator('button.teacher-edit-trash').click();
    const stored = await getStoredData(page);
    expect(Object.keys(stored.teachers)).toHaveLength(0);
    expect(stored.slots).toHaveLength(0);
});

test('adding teacher creates correct slot count (5 days × periods)', async ({ page }) => {
    const periodCount = 3;
    await seedData(page, makeData({ periodCount, teachers: [], groups: [], rooms: [], subjects: [] }));
    await page.click('#nav-setup');
    await page.fill('#teachers-input', 'New Teacher');
    await page.click('#save-teachers-btn');
    const stored = await getStoredData(page);
    const teacherId = Object.keys(stored.teachers)[0];
    const teacherSlots = stored.slots.filter(s => s.teacherId === teacherId);
    expect(teacherSlots).toHaveLength(5 * periodCount);
});

test('no duplicate slot IDs', async ({ page }) => {
    await seedData(page, makeData({
        periodCount: 3,
        teachers: [{ name: 'T1' }, { name: 'T2' }],
        groups: [],
        rooms: [],
        subjects: [],
    }));
    const stored = await getStoredData(page);
    const ids = stored.slots.map(s => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
});

test('data consistent after navigating between pages', async ({ page }) => {
    await seedData(page, makeData({
        periodCount: 2,
        teachers: [{ name: 'Ms. Smith' }],
        groups: [{ name: 'Class A' }],
        rooms: [],
        subjects: [],
    }));
    const initial = await getStoredData(page);
    await page.click('#nav-setup');
    const afterSetup = await getStoredData(page);
    expect(JSON.stringify(initial)).toBe(JSON.stringify(afterSetup));
    await page.click('#nav-timetables');
    const afterTimetables = await getStoredData(page);
    expect(JSON.stringify(initial)).toBe(JSON.stringify(afterTimetables));
    await page.click('#nav-builder');
    const afterBuilder = await getStoredData(page);
    expect(JSON.stringify(initial)).toBe(JSON.stringify(afterBuilder));
});
