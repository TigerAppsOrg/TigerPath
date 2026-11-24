import { SEASONS, YEARS } from './schedule';
import { courseFromSearchResult, isCourseAlreadyScheduled } from './schedule';

export const semesterLabel = (index) =>
  index == null ? null : `${YEARS[Math.floor(index / 2)]} ${SEASONS[index % 2]}`;

/**
 * Review rows for the import dialog. A row can be added only if it maps to a board semester and the
 * course isn't already somewhere in the plan; otherwise `reason` says why it's skipped.
 */
export function buildImportRows(payload, schedule) {
  const items = payload?.courses || [];
  const placedReason = (item) => {
    if (item.semesterIndex == null) {
      return payload?.classYear ? 'Outside your four years' : 'Set your class year in Settings';
    }
    if (isCourseAlreadyScheduled(schedule, item.course?.id)) return 'Already in this plan';
    return null;
  };
  // A course listed more than once (a repeat) keeps one row: the first taken/in-progress one, so a
  // completed retake wins over an earlier incomplete or unclear attempt; otherwise the first row.
  const keeper = new Map();
  items.forEach((item, i) => {
    if (placedReason(item)) return;
    const id = item.course?.id;
    const current = keeper.get(id);
    if (current === undefined || (items[current].status === 'unclear' && item.status !== 'unclear')) {
      keeper.set(id, i);
    }
  });
  return items.map((item, i) => {
    const reason =
      placedReason(item) || (keeper.get(item.course?.id) !== i ? 'Listed twice on the transcript' : null);
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
      // The parser couldn't tell the grade from the title (e.g. a possible W): unchecked by default.
      defaultOff: item.status === 'unclear',
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
