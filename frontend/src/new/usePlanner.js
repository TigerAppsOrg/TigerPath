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
  // True when the last schedule load failed and `schedule` is only an empty placeholder: nothing
  // automatic (like a pending transcript import) may save over the plan in that state.
  const [scheduleLoadFailed, setScheduleLoadFailed] = useState(false);
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
    setScheduleLoadFailed(false);
    api
      .getSchedule()
      .then((data) => setSchedule(data && data.length ? data : emptySchedule()))
      .catch(() => {
        setScheduleLoadFailed(true);
        setSchedule(emptySchedule());
      });
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

  // TIG-282: add the transcript rows the student confirmed, as one normal schedule save, into the
  // plan they picked. Another plan is made active first (the server saves the active plan's schedule),
  // then the rows are applied once its schedule has loaded.
  const [pendingImport, setPendingImport] = useState(null);

  const finishImport = useCallback(
    (rows, targetSchedule, planName) => {
      const { schedule: next, added, skipped } = applyImport(targetSchedule, rows);
      if (added > 0) commitSchedule(next);
      const where = planName ? ` to ${planName}` : '';
      const already = skipped ? ` (${skipped} already there)` : '';
      showNotice(
        added > 0
          ? `Added ${added} course${added === 1 ? '' : 's'} from your transcript${where}${already}.`
          : `Nothing new to add${where}: ${skipped ? 'those courses are already there' : 'no courses selected'}.`,
        added > 0 ? 'success' : 'warning'
      );
      return added;
    },
    [commitSchedule, showNotice]
  );

  const importCourses = useCallback(
    (rows, targetPlanId = activePlanId) => {
      if (targetPlanId == null || targetPlanId === activePlanId) {
        if (!schedule) return Promise.resolve(0);
        if (scheduleLoadFailed) {
          // The plan's courses didn't load; saving now would replace them with just the import.
          showNotice(`Couldn't load ${activePlan?.name || 'this plan'}, so nothing was imported. Please reload and try again.`, 'error');
          return Promise.resolve(0);
        }
        return Promise.resolve(finishImport(rows, schedule, activePlan?.name));
      }
      setPendingImport({ planId: targetPlanId, rows });
      return actions.selectPlan(targetPlanId).catch(() => {
        setPendingImport(null);
        showNotice('Could not switch plans, so nothing was imported. Please try again.', 'error');
      });
    },
    [activePlanId, activePlan, schedule, scheduleLoadFailed, finishImport, actions, showNotice]
  );

  useEffect(() => {
    if (!pendingImport || activePlanId !== pendingImport.planId || !schedule) return;
    setPendingImport(null);
    if (scheduleLoadFailed) {
      // The target plan's courses didn't load; saving now would replace them with just the import.
      showNotice(`Couldn't load ${activePlan?.name || 'that plan'}, so nothing was imported. Please try again.`, 'error');
      return;
    }
    finishImport(pendingImport.rows, schedule, activePlan?.name);
  }, [pendingImport, activePlanId, schedule, scheduleLoadFailed, activePlan, finishImport, showNotice]);

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
