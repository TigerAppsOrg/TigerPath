import React, { Component } from 'react';
import $ from 'jquery';
import Semester, { SEMESTER_TYPE } from 'components/Semester';
import styled from 'styled-components'

const Semesters = styled.div`
  display: grid;
  grid-template-columns: repeat(4, calc(25% - 3.75px));
  grid-template-rows: repeat(2, 1fr);
  height: inherit;
  grid-gap: 5px;
  padding: 0 5px;
`;

const ScheduleSemester = styled(Semester)`
  height: calc(100% - 15px);
`;

export default class Schedule extends Component {
  componentDidMount() {
    // get existing schedule and populate semesters
    $.ajax({
      url: "/api/v1/get_schedule/",
      datatype: 'json',
      type: 'GET',
      success: (schedule) => { if (schedule) this.props.onChange('schedule', schedule); }
    });
  }

  isSemesterFallSem = (semesterType) => {
    return semesterType === SEMESTER_TYPE.FALL_SEM;
  }

  semesters = () => {
    let schedule = this.props.schedule;
    let profile = this.props.profile;
    let semesters = [];

    if (!schedule || !profile || !profile.classYear) return semesters;

    let year = profile.classYear - 4;
    let semesterType = SEMESTER_TYPE.FALL_SEM;

    for (let i = 0; i < 8; i++) {
      let semId = `sem${i}`;
      let semester = this.isSemesterFallSem(semesterType) ? 'Fall' : 'Spring';

      semesters.push(
        <ScheduleSemester
          key={semId}
          onChange={this.props.onChange}
          schedule={schedule}
          semesterIndex={i}
          semesterType={semesterType}
        >
          {semester} {year}
        </ScheduleSemester>
      );

      semesterType = this.isSemesterFallSem(semesterType) ? SEMESTER_TYPE.SPRING_SEM : SEMESTER_TYPE.FALL_SEM;
      if (this.isSemesterFallSem(semesterType)) year++;
    }

    return semesters;
  }

  render() {
    return (
      <Semesters id="semesters">
        {this.semesters()}
      </Semesters>
    );
  }
}
