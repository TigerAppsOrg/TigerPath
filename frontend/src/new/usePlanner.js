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
 * All planner state and server sync. Mirrors the classic App.jsx data flow: every schedule change
 * is saved and requirements are recomputed. Loads and saves name their plan by id, so a save always
 * lands on the plan the schedule on screen came from, whatever the server's active plan is by then.
 */
export default function usePlanner() {
  const [profile, setProfile] = useState(null);
  const [plans, setPlans] = useState([]);
  const [activePlanId, setActivePlanId] = useState(null);
  const [schedule, setSchedule] = useState(null);
  // The plan the on-screen schedule belongs to; every save names it.
  const schedulePlanId = useRef(null);
  // Mirrors activePlanId for async callbacks that must see the latest value.
  const activePlanRef = useRef(null);
  // True when the last schedule load failed and `schedule` is only an empty placeholder: nothing
  // may save over the plan in that state (it would replace the plan's real courses).
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
  // The newest save sent for each plan: a failed save only matters if no later save for that plan
  // (which carries the whole schedule) was sent after it.
  const lastSaveFor = useRef({});
  const plansRef = useRef([]);
  // Only the newest plan load may set the schedule: after a plan switch, a slower response for the
  // previous plan must not land on the new one (a pending import would save it over that plan).
  const loadSeq = useRef(0);
  // Plan actions that change the active plan are numbered too: if a newer one starts, the older one's
  // response (and any recovery read after it fails) is ignored.
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
    plansRef.current = payload?.plans || [];
    setPlans(plansRef.current);
    activePlanRef.current = payload?.activePlanId ?? null;
    setActivePlanId(activePlanRef.current);
  }, []);

  // Load one plan's schedule and requirements by id (null: whatever plan the server has active).
  const loadPlanContents = useCallback((planId) => {
    const seq = ++loadSeq.current;
    const current = () => seq === loadSeq.current;
    // Responses to saves made for the plan on screen until now no longer apply.
    saveSeq.current += 1;
    setSaving(false);
    schedulePlanId.current = planId ?? null;
    setSchedule(null);
    setRequirements(null);
    setScheduleLoadFailed(false);
    api
      .getSchedule(planId)
      .then((data) => current() && setSchedule(data && data.length ? data : emptySchedule()))
      .catch(() => {
        if (!current()) return;
        setScheduleLoadFailed(true);
        setSchedule(emptySchedule());
      });
    api
      .getRequirements(planId)
      .then((data) => current() && setRequirements(unwrapGroupedRequirements(data)))
      .catch(() => current() && setRequirements(unwrapGroupedRequirements(null)));
  }, []);

  const reloadPlan = useCallback(() => loadPlanContents(activePlanRef.current), [loadPlanContents]);

  useEffect(() => {
    api
      .getProfile()
      .then(setProfile)
      // No theme on failure: the remembered theme stays applied instead of resetting to purple.
      .catch(() => setProfile({ classYear: null, theme: null }));
    // The plan list says which plan is active, so its contents can be loaded by id.
    const firstAction = actionSeq.current;
    api
      .getPlans()
      .then((payload) => {
        if (firstAction !== actionSeq.current) return; // a plan action already took over
        applyPlans(payload);
        loadPlanContents(payload?.activePlanId);
      })
      .catch(() => firstAction === actionSeq.current && loadPlanContents(null));
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
  }, [applyPlans, loadPlanContents]);

  const commitSchedule = useCallback(
    (next) => {
      if (scheduleLoadFailed) {
        // The plan's courses never loaded: saving would replace them with only what's on screen.
        showNotice("This plan didn't load, so changes can't be saved. Please reload the page.", 'error');
        return false;
      }
      setSchedule(next);
      const seq = ++saveSeq.current;
      const planId = schedulePlanId.current;
      lastSaveFor.current[planId] = seq;
      setSaving(true);
      api
        .saveScheduleAndGetRequirements(stripSchedule(next), planId)
        .then((data) => {
          if (seq === saveSeq.current) setRequirements(unwrapGroupedRequirements(data));
        })
        .catch(() => {
          if (seq !== saveSeq.current) {
            // The student has moved on (e.g. switched plans). Still say the change was lost, unless a
            // later save for the same plan replaced it.
            if (lastSaveFor.current[planId] === seq && schedulePlanId.current !== planId) {
              const name = plansRef.current.find((p) => p.id === planId)?.name;
              showNotice(`Could not save your last change to ${name || 'your previous plan'}. Please open it and check.`, 'error');
            }
            return;
          }
          showNotice('Could not save your last change. Your plan was reloaded.', 'error');
          // Resync with what the server actually stored instead of showing unsaved edits.
          loadPlanContents(planId);
        })
        .finally(() => {
          if (seq === saveSeq.current) setSaving(false);
        });
    },
    [scheduleLoadFailed, showNotice, loadPlanContents]
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
    reloadPlan();
    if (comparePlanId != null) loadCompare(comparePlanId);
  }, [reloadPlan, loadCompare, comparePlanId]);

  // ── Plans ────────────────────────────────────────────────────────────────

  const planAction = useCallback(
    (request, { reload = true } = {}) =>
      request.then((payload) => {
        applyPlans(payload);
        if (reload) loadPlanContents(payload?.activePlanId);
        return payload;
      }),
    [applyPlans, loadPlanContents]
  );

  // Create, copy, delete and switch can all change which plan the server treats as active, as soon as
  // the request lands. They run one at a time; only the newest one's result is shown. If one fails,
  // re-read the plan list (it may still have changed the server) and show the plan the server is on.
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
          loadPlanContents(payload?.activePlanId);
          return payload;
        },
        (error) => {
          // A failed or half-finished action (e.g. a plan created but not named) may still have changed
          // the server: re-read the plan list and the active plan so the page matches it.
          if (seq === actionSeq.current) {
            api
              .getPlans()
              .then((payload) => {
                if (seq !== actionSeq.current) return; // a newer plan action took over meanwhile
                applyPlans(payload);
                loadPlanContents(payload?.activePlanId);
              })
              .catch(() => seq === actionSeq.current && loadPlanContents(activePlanRef.current));
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

  // TIG-282: add the transcript rows the student confirmed to the plan they picked, as one save.
  // The plan on screen is updated in place. Any other plan is read and saved by id (the active plan
  // never changes underneath it), then shown if the student is still where they started.
  const importCourses = useCallback(
    async (rows, targetPlanId = activePlanId) => {
      const target = targetPlanId ?? activePlanId;
      const planName = plans.find((p) => p.id === target)?.name;
      const where = planName ? ` to ${planName}` : '';
      const report = (added, skipped) =>
        showNotice(
          added > 0
            ? `Added ${added} course${added === 1 ? '' : 's'} from your transcript${where}${skipped ? ` (${skipped} already there)` : ''}.`
            : `Nothing new to add${where}: ${skipped ? 'those courses are already there' : 'no courses selected'}.`,
          added > 0 ? 'success' : 'warning'
        );

      if (target === schedulePlanId.current && schedule && !scheduleLoadFailed) {
        const { schedule: next, added, skipped } = applyImport(schedule, rows);
        if (added > 0 && commitSchedule(next) === false) return 0;
        report(added, skipped);
        return added;
      }

      const startedOn = activePlanRef.current;
      const startedAction = actionSeq.current;
      // Runs in the plan-action queue, so opening the target plan waits until its new courses are saved
      // (the student can't load the old copy and edit it over the import).
      const showsTarget = () => schedulePlanId.current === target;
      const work = actionQueue.current.then(async () => {
        if (showsTarget()) {
          // The target is on screen but not loaded yet: hold off its load until the save is done.
          loadSeq.current += 1;
          setSchedule(null);
        }
        try {
          // Read the plan's stored courses first: saving without them would replace them.
          const stored = await api.getSchedule(target);
          const result = applyImport(stored && stored.length ? stored : emptySchedule(), rows);
          if (result.added > 0) {
            await api.saveScheduleAndGetRequirements(stripSchedule(result.schedule), target);
          }
          report(result.added, result.skipped);
          return result.added;
        } catch {
          showNotice(`Couldn't add the courses${where}. Nothing was imported. Please try again.`, 'error');
          return null;
        } finally {
          if (showsTarget()) loadPlanContents(target);
        }
      });
      actionQueue.current = work.catch(() => {});
      const added = await work;
      if (added == null) return 0;
      if (!showsTarget() && activePlanRef.current === startedOn && actionSeq.current === startedAction) {
        // Still where they started: take them to the plan the courses went to.
        await changeActivePlan(() => api.setActivePlan(target)).catch(() => {});
      }
      return added;
    },
    [activePlanId, plans, schedule, scheduleLoadFailed, commitSchedule, loadPlanContents, changeActivePlan, showNotice]
  );

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
