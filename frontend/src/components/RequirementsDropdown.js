import React, { Component } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import styled from 'styled-components';

const ReqDropdown = styled(Dropdown)`
  display: block;
`;

const ReqDropdownMenu = styled(Dropdown.Menu)`
  overflow: auto;
  max-height: 275px;
`;

const ReqDropdownHeader = styled(({ leftPadding, ...rest }) => (
  <Dropdown.Header {...rest}></Dropdown.Header>
))`
  padding-left: ${({ leftPadding }) => `${leftPadding}rem`};
`;

const ReqDropdownItem = styled(({ leftPadding, ...rest }) => (
  <Dropdown.Item {...rest}></Dropdown.Item>
))`
  padding-left: ${({ leftPadding }) => `${leftPadding}rem`};
`;

export default class RequirementsDropdown extends Component {
  populateReqTree = (reqTree, level) => {
    return reqTree['req_list'].map((requirement, index) => {
      let reqName = requirement['name'];
      let leftPadding = 1.5 + level * 0.5;

      if ('req_list' in requirement) {
        if (reqName === 'Degree Progress') {
          return <React.Fragment key={reqName} />;
        }
        return (
          <React.Fragment key={reqName}>
            <ReqDropdownHeader leftPadding={leftPadding}>
              {reqName}
            </ReqDropdownHeader>
            {this.populateReqTree(requirement, level + 1)}
          </React.Fragment>
        );
      } else {
        return (
          <React.Fragment key={reqName}>
            <ReqDropdownItem
              eventKey={requirement['path_to']}
              leftPadding={leftPadding}
              onSelect={(e) =>
                this.props.handleChange('selectedRequirement', reqName, e)
              }
            >
              {reqName}
            </ReqDropdownItem>
          </React.Fragment>
        );
      }
    });
  };

  requirements = () => {
    let requirements = this.props.requirements;
    let reqLen = requirements.length;
    return requirements.map((mainReq, index) => {
      let name;
      let content;
      let isLastItem = reqLen === index + 1;

      // major is supported
      if (typeof mainReq === 'object') {
        name = mainReq.name;
        content = this.populateReqTree(mainReq, 1);
      }
      // major is not supported yet
      else {
        name = mainReq;
      }

      return (
        <React.Fragment key={name}>
          <Dropdown.Header>{name}</Dropdown.Header>
          {content}
          {!isLastItem && <Dropdown.Divider />}
        </React.Fragment>
      );
    });
  };

  render() {
    let req = this.props.selectedRequirement;
    let dropdownLabel = req ? req.label : 'Select a requirement';
    return (
      <ReqDropdown>
        <Dropdown.Toggle variant="secondary">{dropdownLabel}</Dropdown.Toggle>
        {this.props.requirements && (
          <ReqDropdownMenu>{this.requirements()}</ReqDropdownMenu>
        )}
      </ReqDropdown>
    );
  }
}
