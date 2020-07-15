import React, { useState } from 'react';
import styled, { css } from 'styled-components';
import Schedule from 'components/Schedule';
import ExternalCreditsView from 'components/ExternalCreditsView';
import Loader from './Loader';

const Content = styled.div`
  height: calc(100vh - 93px);
  ${({ isLoading }) =>
    isLoading &&
    css`
      display: flex;
    `}
`;

const Nav = styled.div`
  display: flex;
  flex-direction: row;

  @media print {
    display: none;
  }
`;

const NavButton = styled.button`
  flex: 1;
  border: none;
  cursor: pointer;
  padding: 0.375rem;
  background: white;
  color: ${({ theme }) => theme.lightGrey};
  border-bottom: 1px solid ${({ theme }) => theme.lighterGrey};

  ${({ theme, active }) =>
    active &&
    css`
      color: ${theme.darkGreyText};
      border-bottom: 1px solid white;

      &:first-of-type {
        border-right: 1px solid ${theme.lighterGrey};
      }

      &:last-of-type {
        border-left: 1px solid ${theme.lighterGrey};
      }
    `};

  &:focus {
    outline: none;
  }
`;

const LoaderStyled = styled(Loader)`
  margin: 0 auto;
  text-align: center;
  justify-self: center;
  align-self: center;
`;

const TABS = Object.freeze({
  SCHEDULE_TAB: Symbol('schedule'),
  EXTERNAL_CREDITS_TAB: Symbol('externalCredits'),
});

const MainView = (props) => {
  const { profile, schedule, requirements, setSchedule } = props;
  const [currentTab, setCurrentTab] = useState(TABS.SCHEDULE_TAB);
  const scheduleTabActive = currentTab === TABS.SCHEDULE_TAB;
  const externalCreditsTabActive = currentTab === TABS.EXTERNAL_CREDITS_TAB;

  const renderContent = () => {
    if (!schedule) return <LoaderStyled />;
    if (externalCreditsTabActive) {
      return (
        <ExternalCreditsView
          profile={profile}
          schedule={schedule}
          requirements={requirements}
          setSchedule={setSchedule}
        />
      );
    } else {
      return (
        <Schedule
          profile={profile}
          schedule={schedule}
          setSchedule={setSchedule}
        />
      );
    }
  };

  return (
    <>
      <Nav id="main-view-tabs">
        <NavButton
          active={scheduleTabActive}
          onClick={() => setCurrentTab(TABS.SCHEDULE_TAB)}
        >
          Schedule
        </NavButton>
        <NavButton
          active={externalCreditsTabActive}
          onClick={() => setCurrentTab(TABS.EXTERNAL_CREDITS_TAB)}
        >
          AP and Other External Credits
        </NavButton>
      </Nav>
      <Content isLoading={!schedule}>{renderContent()}</Content>
    </>
  );
};

export default MainView;
