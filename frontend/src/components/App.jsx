import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch, apiPost } from 'utils/api';
import Search from 'components/Search';
import MainView from 'components/MainView';
import Requirements from 'components/Requirements';
import { DragDropContext } from '@hello-pangea/dnd';
import { ThemeProvider } from 'styled-components';
import { TIGERPATH_THEME } from 'styles/theme';
import { DEFAULT_SCHEDULE } from 'utils/SemesterUtils';

const RADIX = 10;

export default function App() {
  const [profile, setProfile] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [requirements, setRequirements] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

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
      .catch(() => setProfile({ classYear: null }));
  }, []);

  const fetchRequirements = useCallback(() => {
    apiFetch('/api/v1/get_requirements/')
      .then(handleRequirementData)
      .catch(() => setRequirements([]));
  }, [handleRequirementData]);

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
        .catch(() => {});
    },
    [handleRequirementData]
  );

  useEffect(() => {
    fetchProfile();
    fetchRequirements();
  }, [fetchProfile, fetchRequirements]);

  const prevScheduleRef = React.useRef(null);
  useEffect(() => {
    if (schedule !== prevScheduleRef.current) {
      if (prevScheduleRef.current !== null) {
        updateScheduleAndGetRequirements(schedule);
      }
      prevScheduleRef.current = schedule;
    }
  }, [schedule, updateScheduleAndGetRequirements]);

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
        let course = {};
        course['id'] = searchResultsCourse['id'];
        course['name'] = searchResultsCourse['name'];
        course['title'] = searchResultsCourse['title'];
        course['dist_area'] = searchResultsCourse['dist_area'];
        course['semester'] = searchResultsCourse['semester'];
        course['semester_list'] = searchResultsCourse['semester_list'];
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

  return (
    <ThemeProvider theme={TIGERPATH_THEME}>
      <>
        <h1 className="print-only">My Four Year Schedule</h1>
        <p className="print-only">
          This schedule was created using{' '}
          <b>TigerPath - Princeton's Four-Year Course Planner</b> at{' '}
          <a
            href="http://www.tigerpath.io/"
            target="_blank"
            rel="noopener noreferrer"
          >
            tigerpath.io
          </a>
          .
        </p>
        <DragDropContext onDragEnd={onDragEnd}>
          <div id="search-pane" className="col-lg-2 pl-0 pr-0 dont-print">
            <Search
              onChange={onChange}
              searchQuery={searchQuery}
              searchResults={searchResults}
            />
          </div>
          <div className="col-lg-8 pl-0 pr-0">
            <MainView
              onChange={onChange}
              profile={profile}
              schedule={schedule}
              requirements={requirements}
            />
          </div>
        </DragDropContext>
        <div className="col-lg-2 pl-0 pr-0 break dont-print">
          <Requirements
            onChange={onChange}
            requirements={requirements}
            schedule={schedule}
          />
        </div>
      </>
    </ThemeProvider>
  );
}
