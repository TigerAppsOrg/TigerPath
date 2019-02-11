import React, { Component } from 'react';
import $ from 'jquery';
import Semester from 'components/Semester';
import styled from 'styled-components'
import { getSemesterNames } from 'utils/SemesterUtils';

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

  semesters = () => {
    let profile = this.props.profile;
    if (!profile || !profile.classYear) return [];

    let semesterNames = getSemesterNames(profile.classYear);
    let semesters = semesterNames.map((semName, index) => {
      let semId = `sem${index}`;
      return (
        <ScheduleSemester
          key={semId}
          onChange={this.props.onChange}
          schedule={this.props.schedule}
          semesterIndex={index}
        >
          {semName}
        </ScheduleSemester>
      );
    });
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
