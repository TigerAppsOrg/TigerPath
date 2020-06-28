import React from 'react';
import styled from 'styled-components';

const ReqCourseStyled = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
`;

const ReqCourseName = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ReqCourse = (props) => {
  const { course, isSettled, onClick } = props;

  return (
    <ReqCourseStyled
      className={isSettled ? 'settled' : 'unsettled text-muted'}
      onClick={onClick}
    >
      <ReqCourseName>{course}</ReqCourseName>
      {!isSettled && (
        <i
          className="ml-2 fa fa-exclamation-circle"
          title="This course can satisfy multiple requirements. Please choose a requirement for it to satisfy."
        ></i>
      )}
    </ReqCourseStyled>
  );
};

export default ReqCourse;
