import React, { useEffect } from 'react';
import { apiFetch } from 'utils/api';
import Semester from 'components/Semester';
import styled from 'styled-components';
import { getSemesterNames, DEFAULT_SCHEDULE } from 'utils/SemesterUtils';
import { addPopover } from 'Popover';

const Semesters = styled.div`
  display: grid;
  grid-template-columns: repeat(4, calc(25% - 3.75px));
  grid-template-rows: repeat(2, 1fr);
  height: inherit;
  grid-gap: 5px;
  padding: 0 5px;
`;

const MissingYearNotice = styled.p`
  margin: 0;
  padding: 0 7px 5px;
`;

export default function Schedule({ onChange, profile, schedule }) {
  const hasLoadedProfile = profile !== null;
  const shouldShowMissingYearNotice = hasLoadedProfile && !profile?.classYear;

  useEffect(() => {
    if (schedule === null) {
      apiFetch('/api/v1/get_schedule/')
        .then((data) => {
          if (data) onChange('schedule', data);
          addPopovers(data);
        })
        .catch(() => {
          onChange(
            'schedule',
            DEFAULT_SCHEDULE.map((semester) => semester.slice())
          );
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
    const courseNameCounts = new Map();
    for (const semester of sched) {
      for (const course of semester) {
        const normalizedName = (course?.name || '').trim().toUpperCase();
        if (!normalizedName) continue;
        courseNameCounts.set(
          normalizedName,
          (courseNameCounts.get(normalizedName) || 0) + 1
        );
      }
    }

    for (let semIndex = 0; semIndex < sched.length; semIndex++) {
      for (let courseIndex = 0; courseIndex < sched[semIndex].length; courseIndex++) {
        let course = sched[semIndex][courseIndex];
        let courseKey = `course-card-${course['semester']}-${semIndex}-${courseIndex}`;
        addPopover(course, courseKey, semIndex, courseNameCounts);
      }
    }
  };

  const semesters = () => {
    const classYear = profile?.classYear;
    const semesterNames = classYear
      ? getSemesterNames(classYear)
      : Array.from({ length: 8 }, (_, index) => `Semester ${index + 1}`);

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

  return (
    <>
      {shouldShowMissingYearNotice && (
        <MissingYearNotice className="warning-text">
          Set your class year in Settings to label semesters correctly.
        </MissingYearNotice>
      )}
      <Semesters id="semesters">{semesters()}</Semesters>
    </>
  );
}
