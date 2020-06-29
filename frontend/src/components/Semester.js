import React, { Component } from 'react';
import { Droppable } from 'react-beautiful-dnd';
import styled from 'styled-components';
import {
  SEMESTER_TYPE,
  EXTERNAL_CREDITS_SEMESTER_INDEX,
  getSemesterType,
  isFallSemester,
  isSpringSemester,
} from 'utils/SemesterUtils';
import ScheduleCourseCard from './ScheduleCourseCard';

const SEMESTER_BODY_COLOR = Object.freeze({
  GREY: Symbol('greySemBody'),
  GREEN: Symbol('greenSemBody'),
  RED: Symbol('redSemBody'),
});

const SemesterHeader = styled.div`
  color: #ffffff;
  text-align: center;
  font-size: large;
  padding: 0.5rem;

  background-color: ${({ theme, semesterType }) => {
    switch (semesterType) {
      case SEMESTER_TYPE.FALL_SEM:
        return `${theme.fallSemHeaderColor}`;
      case SEMESTER_TYPE.SPRING_SEM:
        return `${theme.springSemHeaderColor}`;
      default:
        return `${theme.darkOrange}`;
    }
  }};
`;

const SemesterBody = styled.div`
  list-style-type: none;
  padding: 0 0.5rem 0.5rem 0.5rem;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;

  background-color: ${({ theme, semesterBodyColor }) => {
    switch (semesterBodyColor) {
      case SEMESTER_BODY_COLOR.GREEN:
        return `${theme.greenSemBody}`;
      case SEMESTER_BODY_COLOR.RED:
        return `${theme.redSemBody}`;
      default:
        return `${theme.greySemBody}`;
    }
  }};
`;

const SemesterStyled = styled.div`
  border-radius: 0.25rem;
  overflow: hidden;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
`;

export default class Semester extends Component {
  constructor(props) {
    super(props);
    this.state = {
      semesterType: getSemesterType(this.props.semesterIndex),
    };
  }

  removeCourse = (semIndex, courseIndex) => {
    let newSchedule = this.props.schedule.slice();
    newSchedule[semIndex].splice(courseIndex, 1);
    this.props.setSchedule(newSchedule);
  };

  courseCardList = (semester, semIndex, isDraggingOver) => {
    return semester[semIndex].map((course, courseIndex) => {
      let courseKey = `course-card-${course['semester']}-${semIndex}-${courseIndex}`;
      return (
        <ScheduleCourseCard
          key={courseKey}
          course={course}
          courseKey={courseKey}
          onCourseRemove={this.removeCourse}
          semIndex={semIndex}
          courseIndex={courseIndex}
          disablePopover={isDraggingOver}
        />
      );
    });
  };

  getSemesterBodyColor = (snapshot) => {
    if (snapshot.isDraggingOver) {
      let courseKey = snapshot.draggingOverWith;
      let courseSemType = courseKey.split('-')[2];

      if (
        (courseSemType === 'fall' && isFallSemester(this.state.semesterType)) ||
        (courseSemType === 'spring' &&
          isSpringSemester(this.state.semesterType)) ||
        courseSemType === 'both' ||
        courseSemType === 'external'
      ) {
        return SEMESTER_BODY_COLOR.GREEN;
      } else {
        return SEMESTER_BODY_COLOR.RED;
      }
    }

    return SEMESTER_BODY_COLOR.GREY;
  };

  render() {
    let semIndex = this.props.semesterIndex;
    let semId = `sem${semIndex}`;
    let className = 'semester';
    if (this.props.className) className += ` ${this.props.className}`;

    return (
      <SemesterStyled className={className}>
        <SemesterHeader semesterType={this.state.semesterType}>
          {this.props.children}
        </SemesterHeader>
        <Droppable
          key={semId}
          droppableId={semId}
          isDropDisabled={semIndex === EXTERNAL_CREDITS_SEMESTER_INDEX}
        >
          {(provided, snapshot) => (
            <SemesterBody
              ref={provided.innerRef}
              {...provided.droppableProps}
              semesterBodyColor={this.getSemesterBodyColor(snapshot)}
            >
              {this.props.schedule &&
                this.courseCardList(
                  this.props.schedule,
                  semIndex,
                  snapshot.isDraggingOver
                )}
              {provided.placeholder}
            </SemesterBody>
          )}
        </Droppable>
      </SemesterStyled>
    );
  }
}
