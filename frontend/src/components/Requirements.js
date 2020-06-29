import React from 'react';
import ReqDegreeTree from './ReqDegreeTree';
import styled, { css } from 'styled-components';
import Loader from './Loader';

const RequirementsStyled = styled.div`
  height: calc(100vh - 56px);
  overflow: auto;

  ${({ isLoading }) =>
    isLoading &&
    css`
      display: flex;
    `}
`;

const LoaderStyled = styled(Loader)`
  margin: 0 auto;
  text-align: center;
  justify-self: center;
  align-self: center;
`;

const Requirements = (props) => {
  const { requirements, schedule, setSearchQuery, setSchedule } = props;
  return (
    <RequirementsStyled id="requirements" isLoading={!requirements}>
      {requirements ? (
        requirements.map((req, index) => (
          <ReqDegreeTree
            key={index}
            schedule={schedule}
            requirement={req}
            setSearchQuery={setSearchQuery}
            setSchedule={setSchedule}
          />
        ))
      ) : (
        <LoaderStyled />
      )}
    </RequirementsStyled>
  );
};

export default Requirements;
