import React, { useEffect } from 'react';
import $ from 'jquery';
import Semester from 'components/Semester';
import styled from 'styled-components';
import { getSemesterNames } from 'utils/SemesterUtils';

const Semesters = styled.div`
  display: flex;
  flex-wrap: wrap;
  padding: 0.5rem;
  height: 100%;
  overflow-y: auto;
`;

const ScheduleSemester = styled(Semester)`
  display: flex;
  flex-direction: column;
  width: calc(25% - 1rem);
  height: calc(50% - 1rem);
  margin: 0.5rem;
`;

const Schedule = (props) => {
  const { schedule, profile, onChange } = props;

  useEffect(() => {
    if (schedule === null) {
      // get existing schedule and populate semesters
      $.ajax({
        url: '/api/v1/get_schedule/',
        datatype: 'json',
        type: 'GET',
        success: (schedule) => {
          if (schedule) onChange('schedule', schedule);
        },
      });
    }
  }, [schedule]);

  const renderSemesters = () => {
    if (!profile || !profile.classYear) return [];

    let semesterNames = getSemesterNames(profile.classYear);
    let semesters = semesterNames.map((semName, index) => {
      let semId = `sem${index}`;
      return (
        <ScheduleSemester
          key={semId}
          onChange={onChange}
          schedule={schedule}
          semesterIndex={index}
        >
          {semName}
        </ScheduleSemester>
      );
    });
    return semesters;
  };

  return <Semesters id="semesters">{renderSemesters()}</Semesters>;
};

export default Schedule;
