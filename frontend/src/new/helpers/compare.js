import { majorLabel, minorLabel, requirementStatus } from './requirements';

/** Plans the user can compare against the active one: every other plan, never the active plan itself. */
export function compareOptions(plans, activePlanId) {
  return (plans || []).filter((plan) => plan.id !== activePlanId);
}

/**
 * Compact progress for one program tree (compare mode shows two of these side by side instead of
 * two full RequirementsPanels). Unsupported majors arrive from the API as plain strings.
 */
export function programSummary(program, kind) {
  const label = kind === 'minor' ? minorLabel(program) : majorLabel(program);
  if (!program || typeof program !== 'object') {
    return { label, name: String(program || label), unsupported: true, done: 0, total: 0, items: [] };
  }
  const items = (program.req_list || []).map((req) => ({
    name: req.name,
    count: req.count,
    min: req.min_needed,
    status: requirementStatus(req),
  }));
  const counted = items.filter((item) => item.status !== 'neutral');
  return {
    label,
    name: program.name || label,
    unsupported: false,
    done: counted.filter((item) => item.status === 'done').length,
    total: counted.length,
    items,
  };
}

/** Every major then minor on a plan, as summaries. */
export function planSummaries(requirements) {
  if (!requirements) return [];
  return [
    ...(requirements.majors || []).map((m) => programSummary(m, 'major')),
    ...(requirements.minors || []).map((m) => programSummary(m, 'minor')),
  ];
}

const BOARD_SEMESTERS = 8;

/** One identity per course: catalog id, or the name for external credits (which have random ids). */
export const courseKey = (course) => (course?.external ? `ext:${course.name}` : `id:${course?.id}`);

/** Every board semester each course appears in (a course can be scheduled more than once). */
function semestersByKey(schedule) {
  const where = new Map();
  (schedule || []).slice(0, BOARD_SEMESTERS).forEach((semester, index) => {
    (semester || []).forEach((course) => {
      const key = courseKey(course);
      if (!where.has(key)) where.set(key, new Set());
      where.get(key).add(index);
    });
  });
  return where;
}

/** Mark key for one occurrence: the course plus the semester it sits in. */
export const occurrenceKey = (course, semesterIndex) => `${courseKey(course)}@${semesterIndex}`;

function markSide(schedule, otherWhere) {
  const marks = new Map();
  (schedule || []).slice(0, BOARD_SEMESTERS).forEach((semester, index) => {
    (semester || []).forEach((course) => {
      const others = otherWhere.get(courseKey(course));
      let mark;
      if (!others) mark = { status: 'only' };
      else if (others.has(index)) mark = { status: 'same' };
      else mark = { status: 'moved', otherIndex: Math.min(...others) };
      marks.set(occurrenceKey(course, index), mark);
    });
  });
  return marks;
}

/**
 * Per-occurrence differences between two plans, for the "By year" compare view, keyed by
 * `occurrenceKey(course, semester)`: 'same' (the other plan has it in this semester too), 'moved'
 * (only in other semesters there: `otherIndex`) or 'only' (not in the other plan at all). A course
 * scheduled twice gets a mark for each copy. Only the eight board semesters are compared.
 */
export function diffSchedules(left, right) {
  const leftWhere = semestersByKey(left);
  const rightWhere = semestersByKey(right);
  return { left: markSide(left, rightWhere), right: markSide(right, leftWhere) };
}
