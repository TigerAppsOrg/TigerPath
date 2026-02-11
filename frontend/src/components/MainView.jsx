import React, { useState } from 'react';
import styled, { css } from 'styled-components';
import Schedule from 'components/Schedule';
import ExternalCreditsView from 'components/ExternalCreditsView';

const Content = styled.div`
  height: calc(100vh - 98px);
`;

const Nav = styled.div`
  display: flex;
  flex-direction: row;
  height: auto;
  border: 2px solid ${({ theme }) => theme.lightGrey};
  border-radius: 2px;
  margin: 5px 25%;

  @media print {
    display: none;
  }
`;

const NavButton = styled.button`
  ${({ theme, $active }) => css`
    flex: 1;
    border: none;
    cursor: pointer;
    padding: 0;
    background: white;
    color: ${theme.darkGreyText};

    webkit-transition: all 0.15s ease-in-out;
    -moz-transition: all 0.15s ease-in-out;
    -o-transition: all 0.15s ease-in-out;
    transition: all 0.15s ease-in-out;

    ${$active &&
    `
      background: ${theme.lightGrey};
      color: white;
    `};

    &:hover {
      background: ${theme.darkGrey};
      color: white;
    }

    &:focus {
      outline: none;
    }
  `}
`;

const TABS = Object.freeze({
  SCHEDULE_TAB: Symbol('schedule'),
  EXTERNAL_CREDITS_TAB: Symbol('externalCredits'),
});

export default function MainView({ onChange, profile, schedule, requirements }) {
  const [currentTab, setCurrentTab] = useState(TABS.SCHEDULE_TAB);

  let scheduleTabActive = currentTab === TABS.SCHEDULE_TAB;
  let externalCreditsTabActive = currentTab === TABS.EXTERNAL_CREDITS_TAB;

  return (
    <>
      <Nav id="main-view-tabs">
        <NavButton
          $active={scheduleTabActive}
          onClick={() => setCurrentTab(TABS.SCHEDULE_TAB)}
        >
          Schedule
        </NavButton>
        <NavButton
          $active={externalCreditsTabActive}
          onClick={() => setCurrentTab(TABS.EXTERNAL_CREDITS_TAB)}
        >
          AP/External Credits
        </NavButton>
      </Nav>
      <Content>
        {scheduleTabActive && (
          <Schedule
            onChange={onChange}
            profile={profile}
            schedule={schedule}
          />
        )}
        {externalCreditsTabActive && (
          <ExternalCreditsView
            onChange={onChange}
            profile={profile}
            schedule={schedule}
            requirements={requirements}
          />
        )}
      </Content>
    </>
  );
}
