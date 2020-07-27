import React, { useEffect, useState } from 'react';
import Search from 'components/Search';
import MainView from 'components/MainView';
import Requirements from 'components/Requirements';
import { DragDropContext } from 'react-beautiful-dnd';
import { DEFAULT_SCHEDULE } from 'utils/SemesterUtils';
import styled from 'styled-components';
import useSWR from 'swr';
import { getPostHeaders } from '../utils/FetchUtils';

const RADIX = 10;

const AppStyled = styled.div`
  display: flex;
  flex-wrap: wrap;
`;

const App = () => {
  const [profile, setProfile] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [requirements, setRequirements] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const { data: scheduleData } = useSWR('/api/v1/get_schedule/');
  const { data: profileData } = useSWR('/api/v1/get_profile/');
  const { data: requirementsData } = useSWR('/api/v1/get_requirements/');

  useEffect(() => {
    if (!scheduleData) return;
    setSchedule(scheduleData);
  }, [scheduleData]);

  useEffect(() => {
    if (!profileData) return;
    setProfile(profileData);
  }, [profileData]);

  useEffect(() => {
    handleUpdatedRequirements(requirementsData);
  }, [requirementsData]);

  // Updates the schedule in the db and fetches new requirements
  const updateSchedule = async (newSchedule) => {
    setSchedule(newSchedule);

    let strippedSchedule = [];
    for (let semIndex = 0; semIndex < newSchedule.length; semIndex++) {
      strippedSchedule.push([]);
      for (let course of newSchedule[semIndex]) {
        let strippedCourse = { id: course['id'], settled: course['settled'] };
        if (course['external']) {
          strippedCourse['external'] = course['external'];
          strippedCourse['name'] = course['name'];
        }
        strippedSchedule[semIndex].push(strippedCourse);
      }
    }

    const res = await fetch('/api/v1/update_schedule_and_get_requirements/', {
      method: 'POST',
      headers: getPostHeaders(),
      body: JSON.stringify({ schedule: strippedSchedule }),
    });

    if (res.ok) {
      const reqData = await res.json();
      handleUpdatedRequirements(reqData);
    }
  };

  const handleUpdatedRequirements = (data) => {
    if (!data) return;
    // there are 3 fields to the data output, the 2nd indexed field contains the requirements json which we display
    const parsedReqData = data.map((mainReq) => {
      // if mainReq is not an array, then it is just the name of the major
      if (!Array.isArray(mainReq)) return mainReq;
      return mainReq[2];
    });
    setRequirements(parsedReqData);
  };

  const onDragEnd = (result) => {
    let newSchedule = (schedule || DEFAULT_SCHEDULE).slice();

    if (result.destination === null) return;

    let destSemId = parseInt(
      result.destination.droppableId.split('sem')[1],
      RADIX
    );
    let destCourseIndex = result.destination.index;
    let sourceCourseIndex = result.source.index;

    if (result.source.droppableId.includes('search-result-droppable')) {
      // moving course from search results to schedule
      let searchResultsCourse = searchResults[sourceCourseIndex];
      let course = {};
      course['id'] = searchResultsCourse['id'];
      course['name'] = searchResultsCourse['name'];
      course['title'] = searchResultsCourse['title'];
      course['dist_area'] = searchResultsCourse['dist_area'];
      course['semester'] = searchResultsCourse['semester'];
      course['semester_list'] = searchResultsCourse['semester_list'];
      course['settled'] = [];
      newSchedule[destSemId].splice(destCourseIndex, 0, course);
    } else {
      // moving course between or within semesters
      let sourceSemId = parseInt(
        result.source.droppableId.split('sem')[1],
        RADIX
      );
      let course = newSchedule[sourceSemId].splice(sourceCourseIndex, 1)[0];
      newSchedule[destSemId].splice(destCourseIndex, 0, course);
    }

    updateSchedule(newSchedule);
  };

  return (
    <AppStyled>
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
        <div
          id="search-pane"
          className="col-lg-2 pl-0 pr-0 border-right dont-print"
        >
          <Search
            searchQuery={searchQuery}
            searchResults={searchResults}
            setSearchQuery={setSearchQuery}
            setSearchResults={setSearchResults}
          />
        </div>
        <div className="col-lg-8 pl-0 pr-0">
          <MainView
            profile={profile}
            schedule={schedule}
            requirements={requirements}
            setSchedule={updateSchedule}
          />
        </div>
      </DragDropContext>
      <div className="col-lg-2 pl-0 pr-0 border-left break dont-print">
        <Requirements
          requirements={requirements}
          schedule={schedule}
          setSearchQuery={setSearchQuery}
          setSchedule={updateSchedule}
        />
      </div>
    </AppStyled>
  );
};

export default App;
