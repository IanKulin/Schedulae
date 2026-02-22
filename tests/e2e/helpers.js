/**
 * Shared test helpers for Schedulae E2E tests
 */

/** Clear localStorage and reload to a blank state */
export async function clearStorage(page) {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
}

/** Inject pre-built timetable JSON into localStorage and reload */
export async function seedData(page, data) {
    await page.goto('/');
    await page.evaluate((d) => {
        localStorage.setItem('timetableData', JSON.stringify(d));
    }, data);
    await page.reload();
}

/** Read and parse timetableData from localStorage */
export async function getStoredData(page) {
    return page.evaluate(() => {
        const raw = localStorage.getItem('timetableData');
        return raw ? JSON.parse(raw) : null;
    });
}

/** Wait for the debounced auto-save (debounce is 500ms) */
export async function waitForSave(page) {
    await page.waitForTimeout(600);
}

/**
 * Build a minimal timetable data object suitable for seeding.
 * All parameters are optional; defaults create a 3-period timetable with
 * one teacher, one student group, one room, and one subject.
 */
export function makeData({
    periodCount = 3,
    teachers = [{ name: 'Ms. Smith' }],
    groups = [{ name: 'Class A' }],
    rooms = [{ name: 'Room 1' }],
    subjects = [{ name: 'Maths' }],
} = {}) {
    const periods = [];
    for (let i = 1; i <= periodCount; i++) {
        periods.push({ id: i, name: `P${i}` });
    }

    const teachersObj = {};
    teachers.forEach((t, i) => {
        const id = String(i + 1);
        teachersObj[id] = { id, name: t.name };
    });

    const studentGroupsObj = {};
    groups.forEach((g, i) => {
        const id = String(i + 1);
        studentGroupsObj[id] = { id, name: g.name };
    });

    const roomsObj = {};
    rooms.forEach((r, i) => {
        const id = String(i + 1);
        roomsObj[id] = { id, name: r.name };
    });

    const subjectsObj = {};
    subjects.forEach((s, i) => {
        const id = String(i + 1);
        subjectsObj[id] = { id, name: s.name };
    });

    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const slots = [];
    let slotId = 1;
    for (const teacherId of Object.keys(teachersObj)) {
        for (const day of DAYS) {
            for (const period of periods) {
                slots.push({
                    id: String(slotId++),
                    teacherId,
                    day,
                    period: period.id,
                    studentGroupId: null,
                    roomId: null,
                    subjectId: null,
                });
            }
        }
    }

    return { periods, teachers: teachersObj, studentGroups: studentGroupsObj, rooms: roomsObj, subjects: subjectsObj, slots };
}

/**
 * Find the slot in data for a given teacher/day/period
 */
export function findSlot(data, teacherId, day, periodId) {
    return data.slots.find(
        s => s.teacherId === teacherId && s.day === day && s.period === periodId
    );
}
