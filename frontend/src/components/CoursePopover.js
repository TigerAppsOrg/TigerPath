import React from 'react';
import Popover from 'react-tiny-popover';
import $ from 'jquery';
import {
  getSemesterType,
  isFallSemester,
  isSpringSemester,
  convertSemToTermCode,
} from 'utils/SemesterUtils';
import styled from 'styled-components';
import PopoverContent from './PopoverContent';

const BASE_COURSE_OFFERINGS_URL = 'https://www.princetoncourses.com/course/';

const CourseName = styled.div`
  font-weight: bold;
  margin-bottom: 5px;
`;

const PopoverWarning = styled.div`
  color: #e74c3c;
  margin-top: 5px;
`;

const CourseInfoLinks = styled.div`
  margin-top: 5px;
`;

const CoursePopover = (props) => {
  const { children, course, courseKey, semIndex, isOpen } = props;

  const renderPopoverContent = () => {
    const courseName = course['name'];
    const courseTitle = course['title'];
    const courseSemType = course['semester'];
    const courseId = course['id'];
    const courseSemList = course['semester_list'];

    const courseElement = $(`#${courseKey}`);
    courseElement.attr('title', courseName);

    const addedCoursesWithSameName = $('.semester').find(
      `[title="${courseName}"]`
    );

    let termCode;
    let courseInfoLink;
    if (courseSemList && courseSemList.length > 0) {
      termCode = convertSemToTermCode(courseSemList[courseSemList.length - 1]);
      courseInfoLink = `${BASE_COURSE_OFFERINGS_URL}${termCode}${courseId}`;
    }

    return (
      <PopoverContent>
        <CourseName>{courseName}</CourseName>
        {!course['external']
          ? courseTitle
          : "This is an external credit that you've added."}
        {addedCoursesWithSameName.length > 1 && (
          <PopoverWarning>
            This course has already been added to your schedule.
          </PopoverWarning>
        )}
        {courseSemType === 'fall' &&
          isSpringSemester(getSemesterType(semIndex)) && (
            <PopoverWarning>
              This course has previously only been offered in the Fall.
            </PopoverWarning>
          )}
        {courseSemType === 'spring' &&
          isFallSemester(getSemesterType(semIndex)) && (
            <PopoverWarning>
              This course has previously only been offered in the Spring.
            </PopoverWarning>
          )}
        {courseInfoLink && (
          <CourseInfoLinks>
            <a href={courseInfoLink} target="_blank" rel="noopener noreferrer">
              <i className="fas fa-info-circle fa-lg fa-fw course-info" />
            </a>
          </CourseInfoLinks>
        )}
      </PopoverContent>
    );
  };

  return (
    <Popover
      isOpen={isOpen}
      position={['right', 'left']}
      content={renderPopoverContent}
    >
      {children}
    </Popover>
  );
};

export default CoursePopover;
