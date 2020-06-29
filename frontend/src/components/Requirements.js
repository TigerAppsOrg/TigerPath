import React from 'react';
import ReqDegreeTree from './ReqDegreeTree';
import styled from 'styled-components';

const RequirementsStyled = styled.div`
  height: calc(100vh - 56px);
  overflow: auto;
`;

const Requirements = (props) => {
  const { requirements, schedule, setSearchQuery, setSchedule } = props;
  return (
    <RequirementsStyled id="requirements">
      {requirements &&
        requirements.map((req, index) => (
          <ReqDegreeTree
            key={index}
            schedule={schedule}
            requirement={req}
            setSearchQuery={setSearchQuery}
            setSchedule={setSchedule}
          />
        ))}
    </RequirementsStyled>
  );
};

export default Requirements;
