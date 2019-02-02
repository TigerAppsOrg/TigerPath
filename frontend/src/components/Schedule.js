import React, { Component } from 'react';
import $ from 'jquery';
import CourseCard from 'components/CourseCard';
import { Droppable, Draggable } from 'react-beautiful-dnd';

const RADIX = 10;

export default class Schedule extends Component {
  constructor(props) {
    super(props);

    this.state = {
      years: this.getYears(),
      alternatingSemNames: ['fall-sem', 'spring-sem', 'fall-sem', 'spring-sem'],
    };
  }

  componentDidMount() {
    // get existing schedule and populate semesters
    $.ajax({
      url: "/api/v1/get_schedule/",
      datatype: 'json',
      type: 'GET',
      success: (schedule) => { if (schedule) this.props.onChange('schedule', schedule); }
    });
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.profile !== prevProps.profile) {
      this.setState({years: this.getYears()});
    }
  }

  getYears() {
    let profile = this.props.profile;

    if (!profile || !profile.classYear) return null;

    let classYear = profile.classYear;
    let years = [];
    for (let i = -4; i <= 0; i++) {
      years.push(String(classYear+i));
    }

    return years;
  }

  removeCourse = (semIndex, courseIndex) => {
    let newSchedule = this.props.schedule.slice();
    newSchedule[semIndex].splice(courseIndex, 1);
    this.props.onChange('schedule', newSchedule);
  }

  courseCardList = (courseList, semIndex) => {
    return (
      <React.Fragment>
        {courseList.map((course, courseIndex) => {
          let courseKey = `course-card-${course["semester"]}-${semIndex}-${courseIndex}`;
          return (
            <Draggable key={courseKey} draggableId={courseKey} index={courseIndex}>
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

  semesterHeadRow = (years) => {
    return (
      <tr>
        {this.state.alternatingSemNames.map((semName, i) => {
          let semester = semName === 'fall-sem' ? 'Fall' : 'Spring';
          return (
            <td key={i} className={semName}>
              {semester} {years[i]}
            </td>
          );
        })}
      </tr>
    );
  }

  getSemesterBodyClassNames = (semId, snapshot) => {
    let classNames = ['semester'];

    if (snapshot.isDraggingOver) {
      let semIndex = parseInt(semId.split('sem')[1], RADIX);
      let courseKey = snapshot.draggingOverWith;
      let courseSemType = courseKey.split('-')[2];

      if ((courseSemType === 'fall' && semIndex % 2 === 0) ||
          (courseSemType === 'spring' && semIndex % 2 === 1) ||
          courseSemType === 'both') {
        classNames.push('green-tint');
      } else {
        classNames.push('red-tint');
      }
    }

    return classNames.join(' ');
  }

  semesterBodyRow = (semIndices) => {
    return (
      <tr>
        {semIndices.map(i => {
          let semId = `sem${i}`;
          return (
            <Droppable key={semId} droppableId={semId}>
              {(provided, snapshot) => {
                let classNames = this.getSemesterBodyClassNames(semId, snapshot);
                return (
                  <td id={semId} className={classNames} ref={provided.innerRef} {...provided.droppableProps}>
                    {this.props.schedule && this.courseCardList(this.props.schedule[i], i)}
                    {provided.placeholder}
                  </td>
                );
              }}
            </Droppable>
          );
        })}
      </tr>
    );
  }

  render() {
    let years = this.state.years;
    if (this.props.schedule && years) {
      return (
        <table id="semesters">
          <thead className="semester-header">
            {this.semesterHeadRow([years[0], years[1], years[1], years[2]])}
          </thead>
          <tbody>
            {this.semesterBodyRow([0, 1, 2, 3])}
          </tbody>
          <tbody>
            <tr>
              <td className="no-border"></td>
            </tr>
          </tbody>
          <thead className="semester-header">
            {this.semesterHeadRow([years[2], years[3], years[3], years[4]])}
          </thead>
          <tbody>
            {this.semesterBodyRow([4, 5, 6, 7])}
          </tbody>
        </table>
      );
    } else {
      return (
        <table id="semesters"></table>
      )
    }
  }
}
