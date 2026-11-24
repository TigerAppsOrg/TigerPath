import { apiFetch, apiPost, getCookie } from 'utils/api';

// Thin wrappers over the same Django endpoints the classic UI uses, so both
// frontends read and write identical data.

export const getProfile = () => apiFetch('/api/v1/get_profile/');
export const setUiVersion = (uiVersion) => apiPost('/api/v1/set_ui_version/', { uiVersion });

export const getPlans = () => apiFetch('/api/v1/get_plans/');
export const getPlanEditorOptions = () => apiFetch('/api/v1/get_plan_editor_options/');
export const setActivePlan = (planId) =>
  apiPost('/api/v1/set_active_plan/', { planId: String(planId) });
export const createPlan = () => apiPost('/api/v1/create_plan/', {});
export const copyPlan = ({ sourcePlanId, name }) =>
  apiPost('/api/v1/copy_plan/', { sourcePlanId: String(sourcePlanId), name });
export const deletePlan = (planId) => apiPost('/api/v1/delete_plan/', { planId: String(planId) });

/** `majorIds` is the full ordered list; the first is the primary major. */
export const updatePlanSettings = ({ planId, name, majorIds, minorCodes }) =>
  apiPost('/api/v1/update_plan_settings/', {
    planId: String(planId),
    name,
    majorIds: JSON.stringify(majorIds || []),
    minorCodes: JSON.stringify(minorCodes || []),
  });

export const getSchedule = () => apiFetch('/api/v1/get_schedule/');
// "grouped" returns {majors, degrees, minors} covering every major on the plan.
export const getRequirements = () => apiFetch('/api/v1/get_requirements/?layout=grouped');
export const saveScheduleAndGetRequirements = (strippedSchedule) =>
  apiPost('/api/v1/update_schedule_and_get_requirements/?layout=grouped', {
    schedule: JSON.stringify(strippedSchedule),
  });

export const searchCourses = (query, signal) =>
  apiFetch(`/api/v1/get_courses/${encodeURIComponent(query)}`, { signal });
export const getRequirementCourses = (pathTo) =>
  apiFetch(`/api/v1/get_req_courses/${pathTo.replace(/\/\//g, '$')}`);
export const getCourseDetails = (courseId, signal) =>
  apiFetch(`/api/v1/get_course_details/${encodeURIComponent(courseId)}/`, { signal });

// Settings are a Django form view (redirects on success), same as the classic modal.
export async function saveSettings({ year, theme }) {
  const body = new URLSearchParams({ year: String(year), theme });
  const response = await fetch('/settings/save', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'X-CSRFToken': getCookie('csrftoken'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
}

/**
 * TIG-282: upload a transcript PDF and get back a preview of its courses. The server stores
 * nothing; courses are only added when the student confirms (through the normal schedule save).
 */
export async function importTranscript(file) {
  const body = new FormData();
  body.append('transcript', file);
  const response = await fetch('/api/v1/import_transcript/', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'X-CSRFToken': getCookie('csrftoken') },
    body,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Could not read that transcript. Please try again.');
  return payload;
}
