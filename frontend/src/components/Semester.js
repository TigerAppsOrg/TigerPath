import React, { Component } from 'react';
import CourseCard from 'components/CourseCard';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import styled from 'styled-components'
import {
  SEMESTER_TYPE,
  EXTERNAL_CREDITS_SEMESTER_INDEX,
  getSemesterType,
  isFallSemester,
  isSpringSemester
} from 'utils/SemesterUtils';

const SEMESTER_BODY_COLOR = Object.freeze({
  GREY: Symbol('greySemBody'),
  GREEN: Symbol('greenSemBody'),
  RED: Symbol('redSemBody'),
});

const SemesterHeader = styled(
  ({ semesterType, ...rest }) => <div {...rest} />)`
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
  }};
`;

const SemesterBody = styled.div`
  list-style-type: none;
  padding: 5px;
  height: calc(100% - 31px);
  min-height: 200px;
  border-radius: 0 0 2px 2px;

  background-color: ${({theme, semesterBodyColor}) => {
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

  getSemesterBodyColor = snapshot => {
    if (snapshot.isDraggingOver) {
      let courseKey = snapshot.draggingOverWith;
      let courseSemType = courseKey.split('-')[2];

      if ((courseSemType === 'fall' && isFallSemester(this.state.semesterType)) ||
          (courseSemType === 'spring' && isSpringSemester(this.state.semesterType)) ||
          courseSemType === 'both' ||
          courseSemType === 'external') {
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
      <div className={className}>
        <SemesterHeader semesterType={this.state.semesterType}>
          {this.props.children}
        </SemesterHeader>
        <Droppable key={semId} droppableId={semId} isDropDisabled={semIndex === EXTERNAL_CREDITS_SEMESTER_INDEX}>
          {(provided, snapshot) => (
            <SemesterBody ref={provided.innerRef} {...provided.droppableProps}
                          semesterBodyColor={this.getSemesterBodyColor(snapshot)}>
              {this.props.schedule && this.courseCardList(this.props.schedule, semIndex)}
              {provided.placeholder}
            </SemesterBody>
          )}
        </Droppable>
      </div>
    )
  }
}
