import React, { useState } from 'react';
import styled, { css } from 'styled-components';
import Loader from './Loader';

const ReqCourseStyled = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
  list-style-type: none;
  padding: 0.25rem;
  margin-bottom: 0.25rem;
  border-radius: 0.25rem;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  color: #4b0082;
  background-color: #d1dcff;

  &:hover {
    color: #6c757d;
    background-color: #dbe4ff;
  }

  ${({ isSettled }) =>
    !isSettled &&
    css`
      color: #6c757d;
      background-color: #dcdcdc;

      &:hover {
        color: #4b0082;
        background-color: #dbe4ff;
      }
    `}
`;

const ReqCourseName = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const AlertIcon = styled.i`
  color: #e74c3c;
`;

const ReqCourse = (props) => {
  const { course, isSettled, onClick } = props;
  const [isUpdating, setIsUpdating] = useState(false);

  const onCourseClick = async () => {
    setIsUpdating(true);
    await onClick();
    setIsUpdating(false);
  };

  const renderIcon = () => {
    if (isUpdating) {
      return <Loader size={10} />;
    } else if (!isSettled) {
      return (
        <AlertIcon
          className="ml-2 fa fa-exclamation-circle"
          title="This course can satisfy multiple requirements. Please choose a requirement for it to satisfy."
        />
      );
    } else {
      return null;
    }
  };

  return (
    <ReqCourseStyled isSettled={isSettled} onClick={onCourseClick}>
      <ReqCourseName>{course}</ReqCourseName>
      {renderIcon()}
    </ReqCourseStyled>
  );
};

export default ReqCourse;
