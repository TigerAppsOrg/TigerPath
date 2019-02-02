import React, { Component } from 'react';

export default class CourseCard extends Component {
  removeCourse = () => {
    this.props.onCourseRemove(this.props.semIndex, this.props.courseIndex);
  }

  getClassNames = () => {
    let classNames = [];
    classNames.push('course-card');
    classNames.push(this.props.course["semester"]);
    if (this.props.isDragging) classNames.push('course-card-shadow');
    if (this.props.isPlaceholder) classNames.push('placeholder-course');
    return classNames.join(' ');
  }

  render() {
    let course = this.props.course;
    return (
      <div id={this.props.courseKey} title={course["name"]} className={this.getClassNames()}
           ref={this.props.innerRef} {...this.props.draggable} {...this.props.dragHandle}>
        <div className="course-name">{course["name"]}</div>
        <i className="fas fa-times-circle delete-course" onClick={this.removeCourse} />
      </div>
    );
  }
}
