import React, { Component } from 'react';
import SearchCourseCard from './SearchCourseCard';
import styled, { css } from 'styled-components';

const RADIX = 10;
const BASE_COURSE_OFFERINGS_URL = 'https://www.princetoncourses.com/course/';

const SearchCardLinks = styled.div`
  visibility: hidden;
  white-space: nowrap;
  margin-left: 0.25rem;
`;

const SearchCardInfo = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
`;

const CourseTitle = styled.div`
  font-weight: bold;
`;

const PreviousSemText = styled.div`
  margin-top: 0.25rem;
  font-size: 12px;
`;

const SearchCardStyled = styled.div`
  font-size: 14px;
  height: auto;
  margin: 0 0.5rem 0.5rem 0.5rem;
  border-radius: 0.25rem;
  background-color: #f5f5f5;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);

  ${({ theme, semester }) =>
    (semester === 'fall' &&
      css`
        background-color: ${theme.fallSearchCardBgColor};
        color: ${theme.fallCourseTextColor};
      `) ||
    (semester === 'spring' &&
      css`
        background-color: ${theme.springSearchCardBgColor};
        color: ${theme.springCourseTextColor};
      `) ||
    (semester === 'both' &&
      css`
        background: linear-gradient(
          to right,
          ${theme.fallSearchCardBgColor},
          ${theme.springSearchCardBgColor}
        );
        color: ${theme.bothCourseTextColor};
      `)}

  &:hover {
    ${SearchCardLinks} {
      visibility: visible;
    }
  }
`;

export default class SearchCard extends Component {
  /* Helper function to convert a semester into readable form */
  convertSemToReadableForm = (sem) => {
    if (sem[0] === 'f') {
      return 'Fall 20' + sem.slice(1);
    } else {
      return 'Spring 20' + sem.slice(1);
    }
  };

  /* Converts semester list to human readable form, using the two most recent semesters */
  getPrevOfferedSemList = (semList) => {
    // Sort semester list according to when they happened
    semList.sort(function (sem1, sem2) {
      let yearCmp =
        parseInt(sem1.slice(1), RADIX) - parseInt(sem2.slice(1), RADIX);
      if (yearCmp !== 0) return yearCmp;
      else if (sem1[0] === 's' && sem2[0] === 'f') return -1;
      else if (sem1[0] === 'f' && sem2[0] === 's') return 1;
      else return 0;
    });

    // Convert to readable form
    let result = '';
    for (
      let index = Math.max(0, semList.length - 2);
      index < semList.length;
      index++
    ) {
      result += this.convertSemToReadableForm(semList[index]);
      if (index !== semList.length - 1) result += ', ';
    }
    return result;
  };

  /* Converts semester to term code */
  convertSemToTermCode = (sem) => {
    let code = '1';
    if (sem[0] === 'f') {
      code += (parseInt(sem.slice(1), 10) + 1).toString() + '2';
    } else {
      code += sem.slice(1) + '4';
    }
    return code;
  };

  render() {
    let course = this.props.course;
    let courseId = course['id'];
    let courseSemList = course['semester_list'];
    let termCode = this.convertSemToTermCode(
      courseSemList[courseSemList.length - 1]
    );

    let courseInfoLink = `${BASE_COURSE_OFFERINGS_URL}${termCode}${courseId}`;
    let prevOfferedSemList = this.getPrevOfferedSemList(courseSemList);

    return (
      <SearchCardStyled semester={course['semester']}>
        <>
          <SearchCourseCard
            course={course}
            courseKey={this.props.courseKey}
            courseIndex={this.props.index}
          />
          <SearchCardInfo>
            <div>
              <CourseTitle>{course['title']}</CourseTitle>
              <PreviousSemText>{`Previously: ${prevOfferedSemList}`}</PreviousSemText>
            </div>
            <SearchCardLinks>
              <a
                href={courseInfoLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="fas fa-info-circle fa-lg fa-fw course-info" />
              </a>
            </SearchCardLinks>
          </SearchCardInfo>
        </>
      </SearchCardStyled>
    );
  }
}
