import React, { Component } from 'react';
import $ from 'jquery';

export default class CourseCard extends Component {
  removeCourse = () => {
    this.props.onCourseRemove(this.props.semIndex, this.props.courseIndex);
    $(`#${this.props.courseKey}`).popover('hide');
  };

  getClassNames = () => {
    let classNames = [];
    classNames.push('course-card');
    classNames.push(this.props.course['semester']);
    if (this.props.isDragging) classNames.push('course-card-shadow');
    if (this.props.isPlaceholder) classNames.push('placeholder-course');
    return classNames.join(' ');
  };

  render() {
    let course = this.props.course;
    return (
      <div className="unbreakable">
        <div
          id={this.props.courseKey}
          title={course['name']}
          className={this.getClassNames()}
          ref={this.props.innerRef}
          {...this.props.draggable}
          {...this.props.dragHandle}
        >
          <div className="course-name">{course['name']}</div>
          <i
            className="fas fa-times-circle delete-course"
            onClick={this.removeCourse}
          />
        </div>
        <div className="search-card-info print-only">{course['title']}</div>
      </div>
    );
  }
}
