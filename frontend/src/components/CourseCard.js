import React, { Component } from 'react';
import $ from 'jquery';
import { Draggable } from 'react-beautiful-dnd';
import { EXTERNAL_CREDITS_SEMESTER_INDEX } from 'utils/SemesterUtils';

export default class CourseCard extends Component {
  removeCourse = () => {
    this.props.onCourseRemove(this.props.semIndex, this.props.courseIndex);
    $(`#${this.props.courseKey}`).popover('hide');
  };

  getClassNames = (isDragging) => {
    let classNames = [];
    classNames.push('course-card');
    classNames.push(this.props.course['semester']);
    if (isDragging) classNames.push('course-card-shadow');
    return classNames.join(' ');
  };

  render() {
    let { course, courseKey, courseIndex, semIndex } = this.props;
    return (
      <div className="unbreakable">
        <Draggable
          draggableId={courseKey}
          index={courseIndex}
          isDragDisabled={semIndex === EXTERNAL_CREDITS_SEMESTER_INDEX}
        >
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              id={courseKey}
              title={course['name']}
              className={this.getClassNames(snapshot.isDragging)}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
            >
              <div className="course-name">{course['name']}</div>
              <i
                className="fas fa-times-circle delete-course"
                onClick={this.removeCourse}
              />
            </div>
          )}
        </Draggable>
        <div className="search-card-info print-only">{course['title']}</div>
      </div>
    );
  }
}
