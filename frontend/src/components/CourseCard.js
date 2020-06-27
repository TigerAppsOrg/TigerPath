import React, { forwardRef } from 'react';
import styled, { css } from 'styled-components';

const DeleteButton = styled.i`
  display: none;
  float: right;
  margin-top: 4px;
  color: #666;

  &:hover {
    color: #e74c3c;
    cursor: pointer;
  }
`;

const CourseCardStyled = styled.div`
  font-size: large;
  height: 36px;
  padding: 5px;
  border-radius: 2px;
  margin-bottom: 5px;

  &:hover {
    cursor: grab;
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23);
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
      box-shadow: 0 14px 28px rgba(0, 0, 0, 0.25),
        0 10px 10px rgba(0, 0, 0, 0.22);
      z-index: 1;
    `}

  ${({ semester }) =>
    (semester === 'fall' &&
      css`
        background-color: #eaccff;
        color: #53008f;
      `) ||
    (semester === 'spring' &&
      css`
        background-color: #c4e3ed;
        color: #004a63;
      `) ||
    (semester === 'both' &&
      css`
        background: linear-gradient(to right, #eaccff, #c4e3ed);
        color: #333;
      `) ||
    (semester === 'external' &&
      css`
        background-color: #f3d9be;
        color: #753a00;
      `)}
`;

const CourseName = styled.div`
  max-width: calc(100% - 18px);
  overflow: hidden;
  float: left;
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
      <CourseName className="course-name">{course['name']}</CourseName>
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
