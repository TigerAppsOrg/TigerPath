import React, { useState } from 'react';
import TreeView from 'react-treeview';
import ReqDegreeLabel from './ReqDegreeLabel';
import ReqCategoryTree from './ReqCategoryTree';
import ReqCourseList from './ReqCourseList';
import { isReqComplete } from '../utils/RequirementUtils';
import styled, { css } from 'styled-components';

const DegreeTreeContainer = styled.div`
  & > .degree-tree > .degree-tree-label {
    display: flex;
    cursor: pointer;
    padding: 0.25rem;
    margin-bottom: 0.25rem;

    ${({ theme, degreeStatus }) =>
      (degreeStatus === 'incomplete' &&
        css`
          background-color: ${theme.reqIncompleteBgColor};
          color: ${theme.reqIncompleteTextColor};
        `) ||
      (degreeStatus === 'complete' &&
        css`
          background-color: ${theme.reqCompleteBgColor};
          color: ${theme.reqCompleteTextColor};
        `)}
  }

  & > .degree-tree > .degree-tree-children {
    margin-right: 0.25rem;
  }
`;

const ReqDegreeTree = (props) => {
  const { schedule, requirement, setSearchQuery, setSchedule } = props;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isReqSupported = typeof requirement === 'object';

  const populateCategoryTree = (req) => {
    return req['req_list'].map((subreq, index) => (
      <ReqCategoryTree
        key={index}
        requirement={subreq}
        setSearchQuery={setSearchQuery}
      >
        {'req_list' in subreq ? (
          populateCategoryTree(subreq)
        ) : (
          <ReqCourseList
            schedule={schedule}
            requirement={subreq}
            setSchedule={setSchedule}
          />
        )}
      </ReqCategoryTree>
    ));
  };

  return (
    <DegreeTreeContainer
      degreeStatus={
        isReqSupported && isReqComplete(requirement) ? 'complete' : 'incomplete'
      }
    >
      <TreeView
        treeViewClassName="degree-tree"
        itemClassName="degree-tree-label"
        childrenClassName="degree-tree-children"
        nodeLabel={
          <ReqDegreeLabel
            requirement={requirement}
            onClick={() => setIsCollapsed(!isCollapsed)}
          />
        }
        collapsed={isCollapsed}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isReqSupported ? (
          populateCategoryTree(requirement)
        ) : (
          <div>
            <p style={{ padding: '5px' }}>
              This major is not supported yet. If you would like to request it,
              let us know{' '}
              <a
                href="https://goo.gl/forms/pKxjmubIOSCOeR8L2"
                target="_blank"
                rel="noopener noreferrer"
              >
                here
              </a>
              .
            </p>
            <p style={{ padding: '5px' }}>
              In the meantime, you can track your AB degree requirements below.
            </p>
          </div>
        )}
      </TreeView>
    </DegreeTreeContainer>
  );
};

export default ReqDegreeTree;
