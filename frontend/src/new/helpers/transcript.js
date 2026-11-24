import { SEASONS, YEARS } from './schedule';
import { courseFromSearchResult, isCourseAlreadyScheduled } from './schedule';

export const semesterLabel = (index) =>
  index == null ? null : `${YEARS[Math.floor(index / 2)]} ${SEASONS[index % 2]}`;

/**
 * Review rows for the import dialog. A row can be added only if it maps to a board semester and the
 * course isn't already somewhere in the plan; otherwise `reason` says why it's skipped.
 */
export function buildImportRows(payload, schedule) {
  const seen = new Set();
  return (payload?.courses || []).map((item, i) => {
    const id = item.course?.id;
    let reason = null;
    if (item.semesterIndex == null) {
      reason = payload?.classYear ? 'Outside your four years' : 'Set your class year in Settings';
    } else if (isCourseAlreadyScheduled(schedule, id)) {
      reason = 'Already in this plan';
    } else if (seen.has(id)) {
      reason = 'Listed twice on the transcript';
    }
    if (!reason) seen.add(id);
    return {
      key: `${item.code}-${item.term}-${i}`,
      code: item.course?.name || item.code,
      title: item.course?.title || '',
      term: item.term,
      status: item.status,
      semesterIndex: item.semesterIndex,
      semester: semesterLabel(item.semesterIndex),
      course: item.course,
      reason,
    };
  });
}

/**
 * New schedule with the chosen rows appended to their semesters (input is not mutated). `skipped`
 * counts rows whose course was already in the schedule; that check happens here when the rows were
 * reviewed against a different plan than the one they land in.
 */
export function applyImport(schedule, rows) {
  const next = (schedule || []).map((semester) => semester.slice());
  let added = 0;
  let skipped = 0;
  rows.forEach((row) => {
    if (row.reason || row.semesterIndex == null || !row.course) return;
    if (isCourseAlreadyScheduled(next, row.course.id)) {
      skipped += 1;
      return;
    }
    while (next.length <= row.semesterIndex) next.push([]);
    next[row.semesterIndex].push(courseFromSearchResult(row.course));
    added += 1;
  });
  return { schedule: next, added, skipped };
}
