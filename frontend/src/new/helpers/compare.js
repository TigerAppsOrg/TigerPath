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
