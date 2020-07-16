import React, { Component } from 'react';
import styled from 'styled-components';
import Schedule from 'components/Schedule';
import ExternalCreditsView from 'components/ExternalCreditsView';

const Content = styled.div`
  height: calc(100vh - 98px);
`;

const Nav = styled.div`
  ${({ theme }) => `
    display: flex;
    flex-direction: row;
    height: auto;
    border: 2px solid ${theme.lightGrey};
    border-radius: 2px;
    margin: 5px 25%;
  `}
`;

const NavButton = styled.button`
  ${({ theme, active }) => `
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

    ${
      active &&
      `
      background: ${theme.lightGrey};
      color: white;
    `
    };

    &:hover {
      background: ${theme.darkGrey};
      color: white;
    }

    &:focus {
      outline: none
    }
  `}
`;

const TABS = Object.freeze({
  SCHEDULE_TAB: Symbol('schedule'),
  EXTERNAL_CREDITS_TAB: Symbol('externalCredits'),
});

export default class MainView extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentTab: TABS.SCHEDULE_TAB,
    };
  }

  setTab = (tab) => {
    this.setState({ currentTab: tab });
  };

  render() {
    let scheduleTabActive = this.state.currentTab === TABS.SCHEDULE_TAB;
    let externalCreditsTabActive =
      this.state.currentTab === TABS.EXTERNAL_CREDITS_TAB;
    return (
      <React.Fragment>
        <Nav id="main-view-tabs" className="dont-print">
          <NavButton
            active={scheduleTabActive}
            onClick={(e) => this.setTab(TABS.SCHEDULE_TAB, e)}
          >
            Schedule
          </NavButton>
          <NavButton
            active={externalCreditsTabActive}
            onClick={(e) => this.setTab(TABS.EXTERNAL_CREDITS_TAB, e)}
          >
            AP/External Credits
          </NavButton>
        </Nav>
        <Content>
          {scheduleTabActive && (
            <Schedule
              onChange={this.props.onChange}
              profile={this.props.profile}
              schedule={this.props.schedule}
            />
          )}
          {externalCreditsTabActive && (
            <ExternalCreditsView
              onChange={this.props.onChange}
              profile={this.props.profile}
              schedule={this.props.schedule}
              requirements={this.props.requirements}
            />
          )}
        </Content>
      </React.Fragment>
    );
  }
}
