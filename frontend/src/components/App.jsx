import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch, apiPost } from 'utils/api';
import Search from 'components/Search';
import MainView from 'components/MainView';
import Requirements from 'components/Requirements';
import { DragDropContext } from '@hello-pangea/dnd';
import { ThemeProvider } from 'styled-components';
import {
  DEFAULT_TIGERPATH_THEME,
  getTigerPathTheme,
  getTigerPathThemeVariables,
} from 'styles/theme';
import { DEFAULT_SCHEDULE } from 'utils/SemesterUtils';

const RADIX = 10;
const DUPLICATE_COURSE_MESSAGE_MS = 2500;

function isCourseAlreadyScheduled(schedule, courseId) {
  return (schedule || [])
    .flat()
    .some((course) => !course?.external && course.id === courseId);
}

export default function App() {
  const [profile, setProfile] = useState(null);
  const [plans, setPlans] = useState([]);
  const [activePlanId, setActivePlanId] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [requirements, setRequirements] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [duplicateCourseMessage, setDuplicateCourseMessage] = useState('');
  const [planEditorOptions, setPlanEditorOptions] = useState({
    majorOptions: [],
    minorOptions: [],
  });

  const handleRequirementData = useCallback((data) => {
    if (data) {
      const processed = data.map((mainReq) => {
        if (!Array.isArray(mainReq)) return mainReq;
        return mainReq[2];
      });
      setRequirements(processed);
    }
  }, []);

  const fetchProfile = useCallback(() => {
    apiFetch('/api/v1/get_profile/')
      .then(setProfile)
      .catch(() => setProfile({ classYear: null, theme: DEFAULT_TIGERPATH_THEME }));
  }, []);

  const fetchRequirements = useCallback(() => {
    apiFetch('/api/v1/get_requirements/')
      .then(handleRequirementData)
      .catch((error) => {
        console.error('[requirements] initial fetch failed', error);
        setRequirements([]);
      });
  }, [handleRequirementData]);

  const fetchPlanEditorOptions = useCallback(() => {
    // Load select options once so the plan editor modal can edit majors/minors client-side.
    return apiFetch('/api/v1/get_plan_editor_options/')
      .then((payload) => {
        setPlanEditorOptions({
          majorOptions: payload?.majorOptions || [],
          minorOptions: payload?.minorOptions || [],
        });
        return payload;
      })
      .catch((error) => {
        console.error('[plans] editor options fetch failed', error);
      });
  }, []);

  const applyPlansPayload = useCallback((payload) => {
    // Keep local plan state in sync with every plan-related API response.
    setPlans(payload?.plans || []);
    setActivePlanId(payload?.activePlanId ?? null);
  }, []);

  const fetchPlans = useCallback(() => {
    return apiFetch('/api/v1/get_plans/')
      .then((payload) => {
        applyPlansPayload(payload);
        return payload;
      })
      .catch((error) => {
        console.error('[plans] fetch failed', error);
      });
  }, [applyPlansPayload]);

  const reloadPlanData = useCallback(() => {
    // Force schedule re-fetch when switching/creating plans so the center grid updates.
    setSchedule(null);
    fetchRequirements();
  }, [fetchRequirements]);

  const setActivePlan = useCallback(
    (planId) => {
      return apiPost('/api/v1/set_active_plan/', { planId: String(planId) })
        .then((payload) => {
          applyPlansPayload(payload);
          reloadPlanData();
        })
        .catch((error) => {
          console.error('[plans] set active failed', error);
        });
    },
    [applyPlansPayload, reloadPlanData]
  );

  const createPlan = useCallback(
    ({ name = '', sourcePlanId = null } = {}) => {
      const requestData = {};
      if (name) requestData.name = name;
      if (sourcePlanId !== null) requestData.sourcePlanId = String(sourcePlanId);
      return apiPost('/api/v1/create_plan/', requestData)
        .then((payload) => {
          applyPlansPayload(payload);
          reloadPlanData();
        })
        .catch((error) => {
          console.error('[plans] create failed', error);
        });
    },
    [applyPlansPayload, reloadPlanData]
  );

  const copyPlan = useCallback(
    ({ sourcePlanId = null, name = '' } = {}) => {
      const requestData = {};
      if (sourcePlanId !== null) requestData.sourcePlanId = String(sourcePlanId);
      if (name) requestData.name = name;
      return apiPost('/api/v1/copy_plan/', requestData)
        .then((payload) => {
          applyPlansPayload(payload);
          reloadPlanData();
        })
        .catch((error) => {
          console.error('[plans] copy failed', error);
        });
    },
    [applyPlansPayload, reloadPlanData]
  );

  const updatePlanSettings = useCallback(
    ({ planId, name, majorId = null, minorCodes = [] }) => {
      // Save the active plan's title + academic metadata in one request.
      const requestData = {
        planId: String(planId),
        name,
        minorCodes: JSON.stringify(minorCodes),
      };
      if (majorId !== null && majorId !== undefined && majorId !== '') {
        requestData.majorId = String(majorId);
      }
      return apiPost('/api/v1/update_plan_settings/', requestData)
        .then((payload) => {
          applyPlansPayload(payload);
          reloadPlanData();
          return payload;
        })
        .catch((error) => {
          console.error('[plans] update settings failed', error);
          throw error;
        });
    },
    [applyPlansPayload, reloadPlanData]
  );

  const deletePlan = useCallback(
    (planId) => {
      return apiPost('/api/v1/delete_plan/', { planId: String(planId) })
        .then((payload) => {
          applyPlansPayload(payload);
          reloadPlanData();
          return payload;
        })
        .catch((error) => {
          console.error('[plans] delete failed', error);
          throw error;
        });
    },
    [applyPlansPayload, reloadPlanData]
  );

  const updateScheduleAndGetRequirements = useCallback(
    (currentSchedule) => {
      let strippedSchedule = [];
      for (let semIndex = 0; semIndex < currentSchedule.length; semIndex++) {
        strippedSchedule.push([]);
        for (let course of currentSchedule[semIndex]) {
          let strippedCourse = { id: course['id'], settled: course['settled'] };
          if (course['external']) {
            strippedCourse['external'] = course['external'];
            strippedCourse['name'] = course['name'];
          }
          strippedSchedule[semIndex].push(strippedCourse);
        }
      }

      apiPost('/api/v1/update_schedule_and_get_requirements/', {
        schedule: JSON.stringify(strippedSchedule),
      })
        .then(handleRequirementData)
        .catch((error) => {
          console.error('[requirements] update failed', error);
          fetchRequirements();
        });
    },
    [fetchRequirements, handleRequirementData]
  );

  useEffect(() => {
    fetchProfile();
    fetchPlans();
    fetchRequirements();
    fetchPlanEditorOptions();
  }, [fetchProfile, fetchPlans, fetchRequirements, fetchPlanEditorOptions]);

  const prevScheduleRef = React.useRef(null);
  useEffect(() => {
    if (schedule !== prevScheduleRef.current) {
      if (prevScheduleRef.current !== null && schedule !== null) {
        updateScheduleAndGetRequirements(schedule);
      }
      prevScheduleRef.current = schedule;
    }
  }, [schedule, updateScheduleAndGetRequirements]);

  useEffect(() => {
    if (!duplicateCourseMessage) return undefined;
    const timeoutId = setTimeout(() => {
      setDuplicateCourseMessage('');
    }, DUPLICATE_COURSE_MESSAGE_MS);
    return () => clearTimeout(timeoutId);
  }, [duplicateCourseMessage]);

  const onChange = useCallback((name, value) => {
    switch (name) {
      case 'profile':
        setProfile(value);
        break;
      case 'schedule':
        setSchedule(value);
        break;
      case 'requirements':
        setRequirements(value);
        break;
      case 'searchQuery':
        setSearchQuery(value);
        break;
      case 'searchResults':
        setSearchResults(value);
        break;
    }
  }, []);

  const onDragEnd = useCallback(
    (result) => {
      // Unified drag/drop handler for search -> semester and semester -> semester moves.
      let currentSchedule = (schedule || DEFAULT_SCHEDULE).slice();
      let currentSearchResults = searchResults;

      if (result.destination === null) return;

      let destSemId = parseInt(
        result.destination.droppableId.split('sem')[1],
        RADIX
      );
      let destCourseIndex = result.destination.index;
      let sourceCourseIndex = result.source.index;

      if (result.source.droppableId.includes('search-result-droppable')) {
        let searchResultsCourse = currentSearchResults[sourceCourseIndex];
        if (isCourseAlreadyScheduled(currentSchedule, searchResultsCourse['id'])) {
          setDuplicateCourseMessage(`${searchResultsCourse['name']} is already in your schedule.`);
          return;
        }

        let course = {};
        course['id'] = searchResultsCourse['id'];
        course['name'] = searchResultsCourse['name'];
        course['title'] = searchResultsCourse['title'];
        course['dist_area'] = searchResultsCourse['dist_area'];
        course['semester'] = searchResultsCourse['semester'];
        course['semester_list'] = searchResultsCourse['semester_list'];
        course['quality_rating'] = searchResultsCourse['quality_rating'] ?? null;
        course['settled'] = [];
        currentSchedule[destSemId].splice(destCourseIndex, 0, course);
      } else {
        let sourceSemId = parseInt(
          result.source.droppableId.split('sem')[1],
          RADIX
        );
        let course = currentSchedule[sourceSemId].splice(
          sourceCourseIndex,
          1
        )[0];
        currentSchedule[destSemId].splice(destCourseIndex, 0, course);
      }

      setSchedule(currentSchedule);
    },
    [schedule, searchResults]
  );

  const activeThemeName = profile?.theme || DEFAULT_TIGERPATH_THEME;
  const activeTheme = useMemo(
    () => getTigerPathTheme(activeThemeName),
    [activeThemeName]
  );

  useEffect(() => {
    const root = document.documentElement;
    const themeVariables = getTigerPathThemeVariables(activeThemeName);
    Object.entries(themeVariables).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
    root.dataset.tigerpathTheme = activeThemeName;
  }, [activeThemeName]);

  return (
    <ThemeProvider theme={activeTheme}>
      <>
        <h1 className="print-only">My Four Year Schedule</h1>
        <p className="print-only">
          This schedule was created using{' '}
          <b>TigerPath - Princeton's Four-Year Course Planner</b> at{' '}
          <a
            href="http://path.tigerapps.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            path.tigerapps.org
          </a>
          .
        </p>
        {/* Single-page layout: search (left), schedule + plan bar (center), requirements (right). */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div id="search-pane" className="col-lg-2 p-0 dont-print">
            <Search
              onChange={onChange}
              searchQuery={searchQuery}
              searchResults={searchResults}
              duplicateCourseMessage={duplicateCourseMessage}
            />
          </div>
          <div id="main-view-pane" className="col-lg-8 p-0">
            <MainView
              onChange={onChange}
              profile={profile}
              schedule={schedule}
              plans={plans}
              activePlanId={activePlanId}
              onSetActivePlan={setActivePlan}
              onCreatePlan={createPlan}
              onUpdatePlanSettings={updatePlanSettings}
              onCopyPlan={copyPlan}
              onDeletePlan={deletePlan}
              planEditorOptions={planEditorOptions}
            />
          </div>
        </DragDropContext>
        <div className="col-lg-2 px-0 break dont-print requirements-pane">
          <Requirements
            onChange={onChange}
            requirements={requirements}
            schedule={schedule}
            activePlanId={activePlanId}
          />
        </div>
      </>
    </ThemeProvider>
  );
}
