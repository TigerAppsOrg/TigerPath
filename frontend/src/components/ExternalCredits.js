import React, { Component } from 'react';
import CourseCard from 'components/CourseCard';

const EXTERNAL_CREDITS_SEMESTER_INDEX = 7;

export default class ExternalCredits extends Component {
  courseCardList = (courseList, semIndex) => {
    return (
      <React.Fragment>
        {courseList.map((course, courseIndex) => {
          let courseKey = `course-card-${semIndex}-${courseIndex}`;
          return (
            <CourseCard key={courseKey} course={course} showSearchInfo={false}
                        onCourseRemove={this.removeCourse} semIndex={semIndex} courseIndex={courseIndex} />
          );
        })}
      </React.Fragment>
    );
  }
  
  render() {
    return (
      <div id="semesters">
        <div className="semester-header">
          <div>External Credits</div>
        </div>
        <div>
          <div className="semester">
            {this.props.schedule && this.courseCardList(this.props.schedule[EXTERNAL_CREDITS_SEMESTER_INDEX], EXTERNAL_CREDITS_SEMESTER_INDEX)}
          </div>
        </div>
      </div>
    );
  }
}
