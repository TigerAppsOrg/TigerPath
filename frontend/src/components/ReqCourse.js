import React from 'react';
import styled from 'styled-components';

const ReqCourseStyled = styled.li`
  user-select: none;
`;

const ReqCourse = (props) => {
  const { course, isSettled, onClick } = props;

  return (
    <ReqCourseStyled
      className={isSettled ? 'settled' : 'unsettled text-muted'}
      onClick={onClick}
    >
      {course}
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
