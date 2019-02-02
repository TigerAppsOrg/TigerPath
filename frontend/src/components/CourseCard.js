import React, { Component } from 'react';

const RADIX = 10;
const BASE_COURSE_OFFERINGS_URL = 'https://registrar.princeton.edu/course-offerings/course_details.xml';
const BASE_COURSE_EVAL_URL = 'https://reg-captiva.princeton.edu/chart/index.php';

export default class CourseCard extends Component {
  /* Helper function to convert a semester into readable form */
  convertSemToReadableForm(sem) {
    if (sem[0] === "f") {
      return "Fall 20" + sem.slice(1);
    } else {
      return "Spring 20" + sem.slice(1);
    }
  }

  /* Converts semester list to human readable form, using the two most recent semesters */
  convertSemListToReadableForm(semList) {
    // Sort semester list according to when they happened
    semList.sort(function(sem1, sem2){
      let yearCmp = parseInt(sem1.slice(1), RADIX) - parseInt(sem2.slice(1), RADIX);
      if (yearCmp !== 0) return yearCmp;
      else if (sem1[0] === "s" && sem2[0] === "f") return -1;
      else if (sem1[0] === "f" && sem2[0] === "s") return 1;
      else return 0;
    });

    // Convert to readable form
    let result = "";
    for (let index = Math.max(0, semList.length - 2); index < semList.length; index++) {
      result += this.convertSemToReadableForm(semList[index]);
      if (index !== semList.length - 1) result += ", ";
    }
    return result;
  }

  /* Converts semester to term code */
  convertSemToTermCode(sem) {
    let code = "1";
    if (sem[0] === "f") {
      code += (parseInt(sem.slice(1), 10) + 1).toString() + "2";
    } else {
      code += sem.slice(1) + "4";
    }
    return code;
  }

  removeCourse = () => {
    this.props.onCourseRemove(this.props.semIndex, this.props.courseIndex);
  }

  render() {
    let course = this.props.course;
    let showSearchInfo = this.props.showSearchInfo;
    let termCode;
    if (showSearchInfo) {
      termCode = this.convertSemToTermCode(course["semester_list"][course["semester_list"].length - 1]);
    }

    let cssClasses = []
    cssClasses.push('course-display');
    cssClasses.push(course["semester"]);
    if (this.props.isPlaceholder) cssClasses.push('placeholder-course');
    if (!showSearchInfo) cssClasses.push('small-course-card');
    
    return (
      <li id={course["id"]} ref={this.props.innerRef} {...this.props.draggable} {...this.props.dragHandle}
          className={cssClasses.join(' ')}>
        <p className="course-name">{course["name"]}</p>
        <i className="fas fa-times-circle delete-course" onClick={this.removeCourse}></i>
        {showSearchInfo &&
          <React.Fragment>
            <a href={`${BASE_COURSE_OFFERINGS_URL}?courseid=${course["id"]}&term=${termCode}`} target="_blank" rel="noopener noreferrer">
              <i className="fas fa-info-circle fa-lg fa-fw course-info" />
            </a>
            <a href={`${BASE_COURSE_EVAL_URL}?terminfo=${termCode}&courseinfo=${course["id"]}`} target="_blank" rel="noopener noreferrer">
              <i className="fas fa-chart-bar fa-lg fa-fw course-eval" />
            </a>
            <p className="course-title">{course["title"]}</p>
            <p className="course-semester">
              {"Previously offered in " + this.convertSemListToReadableForm(course["semester_list"])}
            </p>
          </React.Fragment>
        }
      </li>
    );
  }
}