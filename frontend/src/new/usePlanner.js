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
  // Compare mode (TIG-337): a second plan shown read-only next to the active one.
  const [comparePlanId, setComparePlanIdState] = useState(null);
  const [compareSchedule, setCompareSchedule] = useState(null);
  const [compareRequirements, setCompareRequirements] = useState(null);
  // A failed compare read shows an error, never an empty plan (which would look like every course differs).
  const [compareError, setCompareError] = useState(false);
  const compareSeq = useRef(0);
  // True while a tab click swaps the two sides: for a moment the compared plan equals the still-active
  // plan, which must not count as "both sides show the same plan".
  const swapping = useRef(false);

  // Responses for older saves are ignored so fast edits can't apply stale requirements.
  const saveSeq = useRef(0);
  // Only the newest plan load may set the schedule: after a plan switch, a slower response for the
  // previous plan must not land on the new one (a pending import would save it over that plan).
  const loadSeq = useRef(0);
  // Plan actions that change the active plan are numbered too: if a newer one starts, the older one's
  // response is ignored (applying it would point the client at a plan the server has already left).
  const actionSeq = useRef(0);
  // Active-plan changes run one at a time, in order: the server applies each as it lands, so letting
  // two overlap could leave the server on one plan and the page on another.
  const actionQueue = useRef(Promise.resolve());

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
    const seq = ++loadSeq.current;
    const current = () => seq === loadSeq.current;
    setSchedule(null);
    setRequirements(null);
    setScheduleLoadFailed(false);
    api
      .getSchedule()
      .then((data) => current() && setSchedule(data && data.length ? data : emptySchedule()))
      .catch(() => {
        if (!current()) return;
        setScheduleLoadFailed(true);
        setSchedule(emptySchedule());
      });
    api
      .getRequirements()
      .then((data) => current() && setRequirements(unwrapGroupedRequirements(data)))
      .catch(() => current() && setRequirements(unwrapGroupedRequirements(null)));
  }, []);

  useEffect(() => {
    api
      .getProfile()
      .then(setProfile)
      // No theme on failure: the remembered theme stays applied instead of resetting to purple.
      .catch(() => setProfile({ classYear: null, theme: null }));
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

  // ── Compare mode ─────────────────────────────────────────────────────────
  // Read-only GETs by planId: opening, switching or closing compare never calls setActivePlan
  // and never saves a schedule.

  const loadCompare = useCallback((planId) => {
    const seq = ++compareSeq.current;
    setCompareSchedule(null);
    setCompareRequirements(null);
    setCompareError(false);
    if (planId == null) return;
    const failed = () => {
      if (seq !== compareSeq.current) return;
      setCompareSchedule(null);
      setCompareRequirements(null);
      setCompareError(true);
    };
    api
      .getSchedule(planId)
      .then((data) => seq === compareSeq.current && setCompareSchedule(data && data.length ? data : emptySchedule()))
      .catch(failed);
    api
      .getRequirements(planId)
      .then((data) => seq === compareSeq.current && setCompareRequirements(unwrapGroupedRequirements(data)))
      .catch(failed);
  }, []);

  const setComparePlanId = useCallback(
    (planId) => {
      const next = planId == null ? null : planId;
      // The same plan can't be on both sides.
      if (next != null && next === activePlanId) return;
      setComparePlanIdState(next);
      loadCompare(next);
    },
    [activePlanId, loadCompare]
  );

  // Close compare if its plan disappears (deleted) or becomes the active plan, e.g. deleting the
  // active plan makes the server activate the compared one; both sides would show the same plan.
  useEffect(() => {
    if (comparePlanId == null) return;
    const sameAsActive = comparePlanId === activePlanId && !swapping.current;
    if (sameAsActive || !plans.some((p) => p.id === comparePlanId)) {
      setComparePlanIdState(null);
      loadCompare(null);
    }
  }, [plans, activePlanId, comparePlanId, loadCompare]);

  // Reload both sides: requirements depend on the class year, so a Settings change must refresh the
  // compared plan too, not only the active one.
  const reloadPlans = useCallback(() => {
    loadPlanContents();
    if (comparePlanId != null) loadCompare(comparePlanId);
  }, [loadPlanContents, loadCompare, comparePlanId]);

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

  // Create, copy, delete and switch can all change which plan the server treats as active, and the
  // server does that as soon as the request lands. So: (1) any load still in flight for the plan we
  // may be leaving stops counting (a waiting import would otherwise save it to the new plan), and
  // (2) if the action fails, reload the plan we're still on so it never stays stuck loading.
  const changeActivePlan = useCallback(
    (makeRequest) => {
      loadSeq.current += 1;
      const seq = ++actionSeq.current;
      const run = actionQueue.current.then(() => makeRequest());
      // Keep the queue going even if this action fails.
      actionQueue.current = run.catch(() => {});
      return run.then(
        (payload) => {
          if (seq !== actionSeq.current) return payload; // a newer plan action is queued after this one
          applyPlans(payload);
          loadPlanContents();
          return payload;
        },
        (error) => {
          // A failed or half-finished action (e.g. a plan created but not named) may still have changed
          // the server: re-read the plan list and the active plan so the page matches it.
          if (seq === actionSeq.current) {
            api.getPlans().then(applyPlans).catch(() => {});
            loadPlanContents();
          }
          throw error;
        }
      );
    },
    [applyPlans, loadPlanContents]
  );

  const actions = useMemo(
    () => ({
      selectPlan: (id) => {
        if (id === activePlanId) return Promise.resolve();
        // Picking the compared plan as active swaps the sides instead of showing one plan twice.
        if (id === comparePlanId) {
          const previous = activePlanId;
          swapping.current = true;
          setComparePlanIdState(previous);
          loadCompare(previous);
          return changeActivePlan(() => api.setActivePlan(id))
            .catch((error) => {
              // Switch failed: put the compared plan back so the sides stay distinct.
              setComparePlanIdState(id);
              loadCompare(id);
              throw error;
            })
            .finally(() => {
              swapping.current = false;
            });
        }
        return changeActivePlan(() => api.setActivePlan(id));
      },
      createPlan: () => changeActivePlan(() => api.createPlan()),
      copyPlan: (sourcePlanId, name) => changeActivePlan(() => api.copyPlan({ sourcePlanId, name })),
      deletePlan: (id) => changeActivePlan(() => api.deletePlan(id)),
      updatePlan: (settings) => planAction(api.updatePlanSettings(settings)),
      // Create a plan, then name it and set its major/minors in one flow.
      createPlanWith: ({ name, majorIds, minorCodes }) =>
        changeActivePlan(() =>
          api
            .createPlan()
            .then((payload) =>
              api.updatePlanSettings({ planId: payload.activePlanId, name, majorIds, minorCodes })
            )
        ),
    }),
    [activePlanId, comparePlanId, loadCompare, planAction, changeActivePlan]
  );

  const activePlan = plans.find((p) => p.id === activePlanId) || null;
  const comparePlan = plans.find((p) => p.id === comparePlanId) || null;

  // TIG-282: add the transcript rows the student confirmed, as one normal schedule save, into the
  // plan they picked. Another plan is made active first (the server saves the active plan's schedule),
  // then the rows are applied once its schedule has loaded.
  const [pendingImport, setPendingImport] = useState(null);
  // True only while the import's own plan switch is in flight (before the server confirms it).
  const importSwitching = useRef(false);

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
        if (!schedule) {
          // Still loading: finish the import once this plan's schedule arrives (the effect below),
          // or report the failure if the load fails.
          setPendingImport({ planId: activePlanId, fromPlanId: activePlanId, rows });
          return Promise.resolve(0);
        }
        if (scheduleLoadFailed) {
          // The plan's courses didn't load; saving now would replace them with just the import.
          showNotice(`Couldn't load ${activePlan?.name || 'this plan'}, so nothing was imported. Please reload and try again.`, 'error');
          return Promise.resolve(0);
        }
        return Promise.resolve(finishImport(rows, schedule, activePlan?.name));
      }
      setPendingImport({ planId: targetPlanId, fromPlanId: activePlanId, rows });
      importSwitching.current = true;
      return actions
        .selectPlan(targetPlanId)
        .catch(() => {
          setPendingImport(null);
          showNotice('Could not switch plans, so nothing was imported. Please try again.', 'error');
        })
        .finally(() => {
          importSwitching.current = false;
        });
    },
    [activePlanId, activePlan, schedule, scheduleLoadFailed, finishImport, actions, showNotice]
  );

  useEffect(() => {
    if (!pendingImport) return;
    // The student went to some other plan before the import finished: drop it rather than apply it
    // later, out of the blue. Only while the import's own switch is in flight may the active plan
    // still be the starting plan; going back to it afterwards cancels too.
    const ownSwitch = importSwitching.current && activePlanId === pendingImport.fromPlanId;
    if (activePlanId !== pendingImport.planId && !ownSwitch) {
      setPendingImport(null);
      showNotice('Import cancelled because you switched plans. Nothing was added.', 'warning');
      return;
    }
    if (activePlanId !== pendingImport.planId || !schedule) return;
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
    reloadPlan: reloadPlans,
    comparePlan,
    compareSchedule,
    compareRequirements,
    compareError,
    retryCompare: () => loadCompare(comparePlanId),
    setComparePlanId,
    importCourses,
    ...actions,
  };
}
