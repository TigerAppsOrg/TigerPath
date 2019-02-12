import React, { Component } from 'react';
import $ from 'jquery';
import Semester from 'components/Semester';
import styled from 'styled-components'
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

export default class Schedule extends Component {
  componentDidMount() {
    if (this.props.schedule === null) {
      // get existing schedule and populate semesters
      $.ajax({
        url: "/api/v1/get_schedule/",
        datatype: 'json',
        type: 'GET',
        success: (schedule) => {
          if (schedule) this.props.onChange('schedule', schedule);
          this.addPopovers(schedule);
        }
      });
    } else {
      this.addPopovers(this.props.schedule);
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.schedule !== prevProps.schedule) {
      this.addPopovers(this.props.schedule);
    }
  }

  addPopovers = schedule => {
    for (let semIndex = 0; semIndex < schedule.length; semIndex++) {
      for (let courseIndex = 0; courseIndex < schedule[semIndex].length; courseIndex++) {
        let course = schedule[semIndex][courseIndex];
        let courseKey = `course-card-${course["semester"]}-${semIndex}-${courseIndex}`;
        addPopover(course, courseKey, semIndex);
      }
    }
  }

  semesters = () => {
    let profile = this.props.profile;
    if (!profile || !profile.classYear) return [];

    let semesterNames = getSemesterNames(profile.classYear);
    let semesters = semesterNames.map((semName, index) => {
      let semId = `sem${index}`;
      return (
        <Semester
          key={semId}
          onChange={this.props.onChange}
          schedule={this.props.schedule}
          semesterIndex={index}
        >
          {semName}
        </Semester>
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
