import React, { forwardRef } from 'react';
import styled, { css } from 'styled-components';

const DeleteButton = styled.i`
  display: none;
  color: #666;
  margin-left: 0.25rem;

  &:hover {
    color: #e74c3c;
    cursor: pointer;
  }
`;

const CourseCardStyled = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: large;
  padding: 0.5rem;
  border-radius: 0.25rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);

  &:hover {
    cursor: grab;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
      0 4px 6px -2px rgba(0, 0, 0, 0.05);
    position: relative;
    z-index: 1;

    ${DeleteButton} {
      display: block;
    }
  }

  ${({ isDragging }) =>
    isDragging &&
    css`
      cursor: grabbing !important;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
        0 10px 10px -5px rgba(0, 0, 0, 0.04);
      z-index: 1;
    `}

  ${({ theme, semester }) =>
    (semester === 'fall' &&
      css`
        background-color: ${theme.fallCourseBgColor};
        color: ${theme.fallCourseTextColor};
      `) ||
    (semester === 'spring' &&
      css`
        background-color: ${theme.springCourseBgColor};
        color: ${theme.springCourseTextColor};
      `) ||
    (semester === 'both' &&
      css`
        background: linear-gradient(
          to right,
          ${theme.fallCourseBgColor},
          ${theme.springCourseBgColor}
        );
        color: ${theme.bothCourseTextColor};
      `) ||
    (semester === 'external' &&
      css`
        background-color: ${theme.externalCourseBgColor};
        color: ${theme.externalCourseTextColor};
      `)}
`;

const CourseName = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CourseCard = (props, ref) => {
  const {
    courseKey,
    course,
    isDragging,
    onCourseRemove,
    ...otherProps
  } = props;

  return (
    <CourseCardStyled
      ref={ref}
      id={courseKey}
      title={course['name']}
      semester={course['semester']}
      isDragging={isDragging}
      {...otherProps}
    >
      <CourseName>{course['name']}</CourseName>
      {onCourseRemove && (
        <DeleteButton
          className="fas fa-times-circle"
          onClick={onCourseRemove}
        />
      )}
    </CourseCardStyled>
  );
};

export default forwardRef(CourseCard);
