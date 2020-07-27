import React from 'react';
import styled from 'styled-components';
import Semester from 'components/Semester';
import ExternalCreditForm from 'components/ExternalCreditForm';
import { EXTERNAL_CREDITS_SEMESTER_INDEX } from 'utils/SemesterUtils';

const ECContent = styled.div`
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  padding: 0.5rem;
  overflow-y: auto;
`;

const ECSemester = styled(Semester)`
  flex: 1;
  margin: 0.5rem;
  height: calc(100% - 1rem);
`;

const ECForm = styled(ExternalCreditForm)`
  flex: 1;
  margin: 0.5rem;
`;

const ExternalCreditsView = (props) => {
  const { schedule, profile, requirements, setSchedule } = props;

  return (
    <ECContent>
      <ECSemester
        schedule={schedule}
        setSchedule={setSchedule}
        semesterIndex={EXTERNAL_CREDITS_SEMESTER_INDEX}
        semName="Your External Credits"
      />
      <ECForm
        profile={profile}
        schedule={schedule}
        requirements={requirements}
        setSchedule={setSchedule}
      />
    </ECContent>
  );
};

export default ExternalCreditsView;
