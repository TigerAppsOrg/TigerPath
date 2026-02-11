import React from 'react';
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

function populateReqTree(reqTree, level, handleChange) {
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
          {populateReqTree(requirement, level + 1, handleChange)}
        </React.Fragment>
      );
    } else {
      return (
        <React.Fragment key={reqName}>
          <ReqDropdownItem
            eventKey={requirement['path_to']}
            leftPadding={leftPadding}
            onSelect={(e) =>
              handleChange('selectedRequirement', reqName, e)
            }
          >
            {reqName}
          </ReqDropdownItem>
        </React.Fragment>
      );
    }
  });
}

export default function RequirementsDropdown({ requirements, handleChange, selectedRequirement }) {
  const renderRequirements = () => {
    let reqLen = requirements.length;
    return requirements.map((mainReq, index) => {
      let name;
      let content;
      let isLastItem = reqLen === index + 1;

      if (typeof mainReq === 'object') {
        name = mainReq.name;
        content = populateReqTree(mainReq, 1, handleChange);
      } else {
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

  let dropdownLabel = selectedRequirement
    ? selectedRequirement.label
    : 'Select a requirement';

  return (
    <ReqDropdown>
      <Dropdown.Toggle variant="secondary">{dropdownLabel}</Dropdown.Toggle>
      {requirements && (
        <ReqDropdownMenu>{renderRequirements()}</ReqDropdownMenu>
      )}
    </ReqDropdown>
  );
}
