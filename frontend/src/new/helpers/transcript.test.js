import { describe, expect, it } from 'vitest';
import { applyImport, buildImportRows, semesterLabel } from './transcript';

const course = (id, name) => ({ id, name, title: `${name} title`, semester: 'both', semester_list: ['f25'] });
const empty = () => Array.from({ length: 9 }, () => []);

const payload = {
  classYear: 2026,
  courses: [
    { code: 'COS 126', term: 'Fall 2022', status: 'taken', semesterIndex: 0, course: course('1', 'COS 126') },
    { code: 'COS 226', term: 'Spring 2023', status: 'taken', semesterIndex: 1, course: course('2', 'COS 226') },
    { code: 'COS 217', term: 'Fall 2023', status: 'current', semesterIndex: 2, course: course('3', 'COS 217') },
    { code: 'COS 126', term: 'Spring 2024', status: 'taken', semesterIndex: 3, course: course('1', 'COS 126') },
    { code: 'MAT 103', term: 'Fall 2027', status: 'current', semesterIndex: null, course: course('4', 'MAT 103') },
  ],
};

describe('buildImportRows', () => {
  it('labels semesters and explains skipped rows', () => {
    const schedule = empty();
    schedule[5].push({ id: '2', name: 'COS 226' });
    const rows = buildImportRows(payload, schedule);
    expect(rows.map((r) => [r.code, r.semester, r.reason])).toEqual([
      ['COS 126', 'Freshman Fall', null],
      ['COS 226', 'Freshman Spring', 'Already in this plan'],
      ['COS 217', 'Sophomore Fall', null],
      ['COS 126', 'Sophomore Spring', 'Listed twice on the transcript'],
      ['MAT 103', null, 'Outside your four years'],
    ]);
  });

  it('asks for a class year when terms could not be placed', () => {
    const rows = buildImportRows({ classYear: null, courses: [{ ...payload.courses[0], semesterIndex: null }] }, empty());
    expect(rows[0].reason).toBe('Set your class year in Settings');
  });
});

describe('applyImport', () => {
  it('adds only addable rows, without mutating the schedule', () => {
    const schedule = empty();
    const rows = buildImportRows(payload, schedule);
    const { schedule: next, added } = applyImport(schedule, rows);
    // COS 126 (once), COS 226, COS 217; the repeat and the unplaced MAT 103 are skipped.
    expect(added).toBe(3);
    expect(next[0].map((c) => c.id)).toEqual(['1']);
    expect(next[1].map((c) => c.id)).toEqual(['2']);
    expect(next[2].map((c) => c.id)).toEqual(['3']);
    expect(next[0][0]).toMatchObject({ name: 'COS 126', settled: [] });
    expect(schedule[0]).toEqual([]);
  });
});

describe('semesterLabel', () => {
  it('names board semesters', () => {
    expect(semesterLabel(7)).toBe('Senior Spring');
    expect(semesterLabel(null)).toBeNull();
  });
});
