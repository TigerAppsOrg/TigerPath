import React, { Component } from 'react';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import styled from 'styled-components'

const ReqDropdownMenu = styled(DropdownMenu)`
  overflow: auto;
  height: 500px;
`;

export default class RequirementsDropdown extends Component {
  constructor(props) {
    super(props);
    this.state = {
      dropdownOpen: false,
    };
  }

  toggle = () => {
    this.setState(prevState => ({
      dropdownOpen: !prevState.dropdownOpen
    }));
  }

  handleRequirementClick = (reqName) => {
    // alert('clicked ' + reqName);
    // this.props.toggle();
  }

  populateReqTree = (reqTree) => {
    return (
      reqTree['req_list'].map((requirement, index) => {
        let reqName = requirement['name'];
        if ('req_list' in requirement) {
          return (
            <React.Fragment key={reqName}>
              <DropdownItem header>{reqName}</DropdownItem>
              {this.populateReqTree(requirement)}
            </React.Fragment>
          );
        } else {
          return (
            <React.Fragment key={reqName}>
              <DropdownItem onClick={(e) => this.handleRequirementClick(reqName, e)}>{reqName}</DropdownItem>
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
      if (typeof mainReq === "object") {
        name = mainReq.name;
        content = this.populateReqTree(mainReq);
      }
      // major is not supported yet
      else {
        name = mainReq;
      }

      return (
        <React.Fragment key={name}>
          <DropdownItem header>{name}</DropdownItem>
          {content}
          <DropdownItem divider />
        </React.Fragment>
      );
    });
  }

  render() {
    return (
      <Dropdown isOpen={this.state.dropdownOpen} toggle={this.toggle}>
        <DropdownToggle caret>
          Select a requirement
        </DropdownToggle>
        {this.props.requirements &&
          <ReqDropdownMenu>
            {this.requirements()}
          </ReqDropdownMenu>
        }
      </Dropdown>
    );
  }
}
