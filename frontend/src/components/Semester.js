import React, { Component } from 'react';
import CourseCard from 'components/CourseCard';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import styled from 'styled-components'

export const SEMESTER_TYPE = Object.freeze({
  FALL_SEM: Symbol('fallSem'),
  SPRING_SEM: Symbol('springSem'),
});

export const EXTERNAL_CREDITS_SEMESTER_INDEX = 8;

const RADIX = 10;

const SEMESTER_BODY_COLOR = Object.freeze({
  GREY: Symbol('greySemBody'),
  GREEN: Symbol('greenSemBody'),
  RED: Symbol('redSemBody'),
});

const SemesterWrapper = styled.div`
  height: 100%;
  border-radius: 2px;
`;

const SemesterHeader = styled.div`
  color: #FFFFFF;
  text-align: center;
  font-size: large;
  border-radius: 2px 2px 0 0;
  padding: 2px;

  background-color: ${({theme, semesterType}) => {
    switch (semesterType) {
      case SEMESTER_TYPE.FALL_SEM:
        return `${theme.fallSemHeaderColor}`;
      case SEMESTER_TYPE.SPRING_SEM:
        return `${theme.springSemHeaderColor}`;
      default:
        return `${theme.darkOrange}`;
    }
  }}
`;

const SemesterBody = styled.div`
  list-style-type: none;
  padding-top: 5px;
  height: calc(100% - 27px);

  background-color: ${({theme, semesterBodyColor}) => {
    switch (semesterBodyColor) {
      case SEMESTER_BODY_COLOR.GREEN:
        return `${theme.greenSemBody}`;
      case SEMESTER_BODY_COLOR.RED:
        return `${theme.redSemBody}`;
      default:
        return `${theme.greySemBody}`;
    }
  }}
`;

export default class Semester extends Component {
  removeCourse = (semIndex, courseIndex) => {
    let newSchedule = this.props.schedule.slice();
    newSchedule[semIndex].splice(courseIndex, 1);
    this.props.onChange('schedule', newSchedule);
  }

  courseCardList = (semester, semIndex) => {
    return (
      <React.Fragment>
        {semester[semIndex].map((course, courseIndex) => {
          let courseKey = `course-card-${course["semester"]}-${semIndex}-${courseIndex}`;
          return (
            <Draggable key={courseKey} draggableId={courseKey} index={courseIndex}
                        isDragDisabled={semIndex === EXTERNAL_CREDITS_SEMESTER_INDEX}>
              {(provided, snapshot) => (
                <CourseCard innerRef={provided.innerRef} draggable={provided.draggableProps} dragHandle={provided.dragHandleProps}
                            course={course} courseKey={courseKey} isDragging={snapshot.isDragging}
                            onCourseRemove={this.removeCourse} semIndex={semIndex} courseIndex={courseIndex} />
              )}
            </Draggable>
          );
        })}
      </React.Fragment>
    );
  }

  getSemesterBodyColor = (semId, snapshot) => {
    if (snapshot.isDraggingOver) {
      let semIndex = parseInt(semId.split('sem')[1], RADIX);
      let courseKey = snapshot.draggingOverWith;
      let courseSemType = courseKey.split('-')[2];

      if ((courseSemType === 'fall' && semIndex % 2 === 0) ||
          (courseSemType === 'spring' && semIndex % 2 === 1) ||
          courseSemType === 'both') {
        return SEMESTER_BODY_COLOR.GREEN;
      } else {
        return SEMESTER_BODY_COLOR.RED;
      }
    }

    return SEMESTER_BODY_COLOR.GREY;
  }

  render() {
    let semIndex = this.props.semesterIndex;
    let semId = `sem${semIndex}`;
    let className = 'semester';
    if (this.props.className) className += ` ${this.props.className}`;

    return (
      <SemesterWrapper className={className}>
        <SemesterHeader semesterType={this.props.semesterType}>
          {this.props.children}
        </SemesterHeader>
        <Droppable key={semId} droppableId={semId} isDropDisabled={semIndex === EXTERNAL_CREDITS_SEMESTER_INDEX}>
          {(provided, snapshot) => (
            <SemesterBody ref={provided.innerRef} {...provided.droppableProps} semesterBodyColor={this.getSemesterBodyColor(semId, snapshot)}>
              {this.props.schedule && this.courseCardList(this.props.schedule, semIndex)}
              {provided.placeholder}
            </SemesterBody>
          )}
        </Droppable>
      </SemesterWrapper>
    )
  }
}
