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

function semesterIndexByKey(schedule) {
  const where = new Map();
  (schedule || []).slice(0, BOARD_SEMESTERS).forEach((semester, index) => {
    (semester || []).forEach((course) => {
      const key = courseKey(course);
      if (!where.has(key)) where.set(key, index);
    });
  });
  return where;
}

function markSide(schedule, otherWhere) {
  const marks = new Map();
  (schedule || []).slice(0, BOARD_SEMESTERS).forEach((semester, index) => {
    (semester || []).forEach((course) => {
      const key = courseKey(course);
      if (!otherWhere.has(key)) marks.set(key, { status: 'only' });
      else if (otherWhere.get(key) !== index) marks.set(key, { status: 'moved', otherIndex: otherWhere.get(key) });
      else marks.set(key, { status: 'same' });
    });
  });
  return marks;
}

/**
 * Per-course differences between two plans, for the "By year" compare view: each course is
 * 'same' (same semester in both), 'moved' (other semester in the other plan: `otherIndex`) or
 * 'only' (not in the other plan at all). Only the eight board semesters are compared.
 */
export function diffSchedules(left, right) {
  const leftWhere = semesterIndexByKey(left);
  const rightWhere = semesterIndexByKey(right);
  return { left: markSide(left, rightWhere), right: markSide(right, leftWhere) };
}
