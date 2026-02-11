import React, { useEffect } from 'react';
import { apiFetch } from 'utils/api';
import Semester from 'components/Semester';
import styled from 'styled-components';
import { getSemesterNames } from 'utils/SemesterUtils';
import { addPopover } from 'Popover';

const Semesters = styled.div`
  display: grid;
  grid-template-columns: repeat(4, calc(25% - 3.75px));
  grid-template-rows: repeat(2, 1fr);
  height: inherit;
  grid-gap: 5px;
  padding: 0 5px;
`;

export default function Schedule({ onChange, profile, schedule }) {
  useEffect(() => {
    if (schedule === null) {
      apiFetch('/api/v1/get_schedule/').then((data) => {
        if (data) onChange('schedule', data);
        addPopovers(data);
      });
    } else {
      addPopovers(schedule);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (schedule) {
      addPopovers(schedule);
    }
  }, [schedule]);

  const addPopovers = (sched) => {
    if (!sched) return;
    for (let semIndex = 0; semIndex < sched.length; semIndex++) {
      for (let courseIndex = 0; courseIndex < sched[semIndex].length; courseIndex++) {
        let course = sched[semIndex][courseIndex];
        let courseKey = `course-card-${course['semester']}-${semIndex}-${courseIndex}`;
        addPopover(course, courseKey, semIndex);
      }
    }
  };

  const semesters = () => {
    if (!profile || !profile.classYear) return [];

    let semesterNames = getSemesterNames(profile.classYear);
    return semesterNames.map((semName, index) => {
      let semId = `sem${index}`;
      return (
        <Semester
          key={semId}
          onChange={onChange}
          schedule={schedule}
          semesterIndex={index}
        >
          {semName}
        </Semester>
      );
    });
  };

  return <Semesters id="semesters">{semesters()}</Semesters>;
}
