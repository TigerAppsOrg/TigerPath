import React, { useEffect } from 'react';
import $ from 'jquery';
import Semester from 'components/Semester';
import styled from 'styled-components';
import { getSemesterNames } from 'utils/SemesterUtils';

const Semesters = styled.div`
  display: grid;
  grid-template-columns: repeat(4, calc(25% - 3.75px));
  grid-template-rows: repeat(2, 1fr);
  height: inherit;
  grid-gap: 5px;
  padding: 0 5px;
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
    return semesters;
  };

  return <Semesters id="semesters">{renderSemesters()}</Semesters>;
};

export default Schedule;
