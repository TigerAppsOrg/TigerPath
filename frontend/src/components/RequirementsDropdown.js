import React, { Component } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import styled from 'styled-components'

const ReqDropdown = styled(Dropdown)`
  display: block;
`;

const ReqDropdownMenu = styled(Dropdown.Menu)`
  overflow: auto;
  max-height: 275px;
`;

export default class RequirementsDropdown extends Component {
  handleRequirementClick = (reqName) => {
    console.log(reqName);
  }

  populateReqTree = (reqTree) => {
    return (
      reqTree['req_list'].map((requirement, index) => {
        let reqName = requirement['name'];
        if ('req_list' in requirement) {
          return (
            <React.Fragment key={reqName}>
              <Dropdown.Header>{reqName}</Dropdown.Header>
              {this.populateReqTree(requirement)}
            </React.Fragment>
          );
        } else {
          return (
            <React.Fragment key={reqName}>
              <Dropdown.Item onClick={(e) => this.handleRequirementClick(requirement['path_to'], e)}>{reqName}</Dropdown.Item>
            </React.Fragment>
          );
        }
      })
    );
  }

  requirements = () => {
    return this.props.requirements.map((mainReq, index) => {
      let name;
      let content;

      // major is supported
      if (typeof mainReq === 'object') {
        name = mainReq.name;
        content = this.populateReqTree(mainReq);
      }
      // major is not supported yet
      else {
        name = mainReq;
      }

      return (
        <React.Fragment key={name}>
          <Dropdown.Header>{name}</Dropdown.Header>
          {content}
          <Dropdown.Divider />
        </React.Fragment>
      );
    });
  }

  render() {
    return (
      <ReqDropdown>
        <Dropdown.Toggle variant="secondary">
          Select a requirement
        </Dropdown.Toggle>
        {this.props.requirements &&
          <ReqDropdownMenu>
            {this.requirements()}
          </ReqDropdownMenu>
        }
      </ReqDropdown>
    );
  }
}
