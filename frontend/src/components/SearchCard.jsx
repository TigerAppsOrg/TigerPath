import React from 'react';
import SearchCourseCard from './SearchCourseCard';

const RADIX = 10;
const BASE_COURSE_OFFERINGS_URL = 'https://www.princetoncourses.com/course/';

function convertSemToReadableForm(sem) {
  if (sem[0] === 'f') {
    return 'Fall 20' + sem.slice(1);
  } else {
    return 'Spring 20' + sem.slice(1);
  }
}

function getPrevOfferedSemList(semList) {
  semList.sort(function (sem1, sem2) {
    let yearCmp =
      parseInt(sem1.slice(1), RADIX) - parseInt(sem2.slice(1), RADIX);
    if (yearCmp !== 0) return yearCmp;
    else if (sem1[0] === 's' && sem2[0] === 'f') return -1;
    else if (sem1[0] === 'f' && sem2[0] === 's') return 1;
    else return 0;
  });

  let result = '';
  for (
    let index = Math.max(0, semList.length - 2);
    index < semList.length;
    index++
  ) {
    result += convertSemToReadableForm(semList[index]);
    if (index !== semList.length - 1) result += ', ';
  }
  return result;
}

function convertSemToTermCode(sem) {
  let code = '1';
  if (sem[0] === 'f') {
    code += (parseInt(sem.slice(1), 10) + 1).toString() + '2';
  } else {
    code += sem.slice(1) + '4';
  }
  return code;
}

export default function SearchCard({ course, courseKey, index: courseIndex }) {
  let courseId = course['id'];
  let courseSemList = course['semester_list'];
  let termCode = convertSemToTermCode(
    courseSemList[courseSemList.length - 1]
  );

  let courseInfoLink = `${BASE_COURSE_OFFERINGS_URL}${termCode}${courseId}`;
  let prevOfferedSemList = getPrevOfferedSemList(courseSemList);

  return (
    <div className={`search-card ${course['semester']}`}>
      <>
        <SearchCourseCard
          course={course}
          courseKey={courseKey}
          courseIndex={courseIndex}
        />
        <div className="search-card-info">
          <div>
            <div className="course-title">{course['title']}</div>
            <div className="course-prev-sems">{`Previously offered in ${prevOfferedSemList}`}</div>
          </div>
          <div className="search-card-links">
            <a
              href={courseInfoLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="fas fa-info-circle fa-lg fa-fw course-info" />
            </a>
          </div>
        </div>
      </>
    </div>
  );
}
