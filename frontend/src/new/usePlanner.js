import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { v1 as uuidv1 } from 'uuid';
import { EXTERNAL_CREDITS_SEMESTER_INDEX } from 'utils/SemesterUtils';
import * as api from './api';
import {
  courseFromSearchResult,
  emptySchedule,
  isCourseAlreadyScheduled,
  stripSchedule,
} from './helpers/schedule';
import { settleCourse, unwrapGroupedRequirements } from './helpers/requirements';
import { applyImport } from './helpers/transcript';

const NOTICE_MS = 2500;

/**
 * All planner state and server sync. Mirrors the classic App.jsx data flow:
 * every schedule change is saved to the active plan and requirements are recomputed.
 */
export default function usePlanner() {
  const [profile, setProfile] = useState(null);
  const [plans, setPlans] = useState([]);
  const [activePlanId, setActivePlanId] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [requirements, setRequirements] = useState(null);
  const [editorOptions, setEditorOptions] = useState({ majorOptions: [], minorOptions: [], maxMajors: 3 });
  const [notice, setNotice] = useState(null);
  const [saving, setSaving] = useState(false);

  // Responses for older saves are ignored so fast edits can't apply stale requirements.
  const saveSeq = useRef(0);

  const showNotice = useCallback((text, tone = 'warning') => setNotice({ text, tone, at: Date.now() }), []);

  useEffect(() => {
    if (!notice) return undefined;
    const id = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(id);
  }, [notice]);

  const applyPlans = useCallback((payload) => {
    setPlans(payload?.plans || []);
    setActivePlanId(payload?.activePlanId ?? null);
  }, []);

  const loadPlanContents = useCallback(() => {
    setSchedule(null);
    setRequirements(null);
    api
      .getSchedule()
      .then((data) => setSchedule(data && data.length ? data : emptySchedule()))
      .catch(() => setSchedule(emptySchedule()));
    api
      .getRequirements()
      .then((data) => setRequirements(unwrapGroupedRequirements(data)))
      .catch(() => setRequirements(unwrapGroupedRequirements(null)));
  }, []);

  useEffect(() => {
    api
      .getProfile()
      .then(setProfile)
      .catch(() => setProfile({ classYear: null, theme: 'purple' }));
    api.getPlans().then(applyPlans).catch(() => {});
    api
      .getPlanEditorOptions()
      .then((payload) =>
        setEditorOptions({
          majorOptions: payload?.majorOptions || [],
          minorOptions: payload?.minorOptions || [],
          maxMajors: payload?.maxMajors || 3,
        })
      )
      .catch(() => {});
    loadPlanContents();
  }, [applyPlans, loadPlanContents]);

  const commitSchedule = useCallback(
    (next) => {
      setSchedule(next);
      const seq = ++saveSeq.current;
      setSaving(true);
      api
        .saveScheduleAndGetRequirements(stripSchedule(next))
        .then((data) => {
          if (seq === saveSeq.current) setRequirements(unwrapGroupedRequirements(data));
        })
        .catch(() => {
          if (seq !== saveSeq.current) return;
          showNotice('Could not save your last change. Your plan was reloaded.', 'error');
          // Resync with what the server actually stored instead of showing unsaved edits.
          loadPlanContents();
        })
        .finally(() => {
          if (seq === saveSeq.current) setSaving(false);
        });
    },
    [showNotice, loadPlanContents]
  );

  // ── Schedule edits ───────────────────────────────────────────────────────

  const addCourse = useCallback(
    (searchResult, semesterIndex, index) => {
      if (!schedule) return;
      if (isCourseAlreadyScheduled(schedule, searchResult.id)) {
        showNotice(`${searchResult.name} is already in your schedule.`);
        return;
      }
      const next = schedule.map((s) => s.slice());
      next[semesterIndex].splice(index ?? next[semesterIndex].length, 0, courseFromSearchResult(searchResult));
      commitSchedule(next);
    },
    [schedule, commitSchedule, showNotice]
  );

  const moveCourse = useCallback(
    (fromSemester, fromIndex, toSemester, toIndex) => {
      if (!schedule) return;
      const next = schedule.map((s) => s.slice());
      const [course] = next[fromSemester].splice(fromIndex, 1);
      next[toSemester].splice(toIndex, 0, course);
      commitSchedule(next);
    },
    [schedule, commitSchedule]
  );

  const removeCourse = useCallback(
    (semesterIndex, index) => {
      const next = schedule.map((s) => s.slice());
      next[semesterIndex].splice(index, 1);
      commitSchedule(next);
    },
    [schedule, commitSchedule]
  );

  const settle = useCallback(
    (courseName, pathTo) => commitSchedule(settleCourse(schedule, courseName, pathTo)),
    [schedule, commitSchedule]
  );

  const addExternalCredit = useCallback(
    (pathTo, name) => {
      const next = schedule.map((s) => s.slice());
      while (next.length <= EXTERNAL_CREDITS_SEMESTER_INDEX) next.push([]);
      next[EXTERNAL_CREDITS_SEMESTER_INDEX].push({
        id: uuidv1(),
        external: true,
        name,
        dist_area: null,
        semester: 'external',
        settled: [pathTo],
      });
      commitSchedule(next);
    },
    [schedule, commitSchedule]
  );

  const removeExternalCredit = useCallback(
    (creditId, pathTo) => {
      const next = schedule.map((semester) =>
        semester
          .map((c) =>
            c?.external && c.id === creditId
              ? { ...c, settled: (c.settled || []).filter((p) => p !== pathTo) }
              : c
          )
          .filter((c) => !(c?.external && c.id === creditId && c.settled.length === 0))
      );
      commitSchedule(next);
    },
    [schedule, commitSchedule]
  );

  // TIG-282: add the transcript rows the student confirmed, as one normal schedule save.
  const importCourses = useCallback(
    (rows) => {
      if (!schedule) return 0;
      const { schedule: next, added } = applyImport(schedule, rows);
      if (added > 0) {
        commitSchedule(next);
        showNotice(`Added ${added} course${added === 1 ? '' : 's'} from your transcript.`, 'success');
      }
      return added;
    },
    [schedule, commitSchedule, showNotice]
  );

  // ── Plans ────────────────────────────────────────────────────────────────

  const planAction = useCallback(
    (request, { reload = true } = {}) =>
      request.then((payload) => {
        applyPlans(payload);
        if (reload) loadPlanContents();
        return payload;
      }),
    [applyPlans, loadPlanContents]
  );

  const actions = useMemo(
    () => ({
      selectPlan: (id) => (id === activePlanId ? Promise.resolve() : planAction(api.setActivePlan(id))),
      createPlan: () => planAction(api.createPlan()),
      copyPlan: (sourcePlanId, name) => planAction(api.copyPlan({ sourcePlanId, name })),
      deletePlan: (id) => planAction(api.deletePlan(id)),
      updatePlan: (settings) => planAction(api.updatePlanSettings(settings)),
      // Create a plan, then name it and set its major/minors in one flow.
      createPlanWith: async ({ name, majorIds, minorCodes }) => {
        const payload = await api.createPlan();
        await planAction(
          api.updatePlanSettings({ planId: payload.activePlanId, name, majorIds, minorCodes })
        );
      },
    }),
    [activePlanId, planAction]
  );

  const activePlan = plans.find((p) => p.id === activePlanId) || null;

  return {
    profile,
    setProfile,
    plans,
    activePlan,
    schedule,
    requirements,
    editorOptions,
    notice,
    showNotice,
    saving,
    addCourse,
    moveCourse,
    removeCourse,
    settle,
    addExternalCredit,
    removeExternalCredit,
    reloadPlan: loadPlanContents,
    importCourses,
    ...actions,
  };
}
