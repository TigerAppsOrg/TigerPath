import React from 'react';
import styled from 'styled-components';
import Semester from 'components/Semester';
import ExternalCreditForm from 'components/ExternalCreditForm';
import { EXTERNAL_CREDITS_SEMESTER_INDEX } from 'utils/SemesterUtils';

const ECContent = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(1, 1fr);
  grid-gap: 20px;
  grid-template-areas: 'sem add';
  padding: 20px 10px 20px 10px;
`;

const ECSemester = styled(Semester)`
  grid-area: sem;
`;

const ECForm = styled(ExternalCreditForm)`
  grid-area: add;
`;

const ExternalCreditsView = (props) => {
  const { schedule, profile, requirements, onChange } = props;

  return (
    <ECContent>
      <ECSemester
        onChange={onChange}
        schedule={schedule}
        semesterIndex={EXTERNAL_CREDITS_SEMESTER_INDEX}
      >
        Your External Credits
      </ECSemester>
      <ECForm
        onChange={onChange}
        profile={profile}
        schedule={schedule}
        requirements={requirements}
      />
    </ECContent>
  );
};

export default ExternalCreditsView;
