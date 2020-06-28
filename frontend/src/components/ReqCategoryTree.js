import React, { useState } from 'react';
import TreeView from 'react-treeview';
import ReqCategoryLabel from './ReqCategoryLabel';
import { isReqComplete, isReqNeutral } from '../utils/RequirementUtils';
import styled, { css } from 'styled-components';

const CategoryTreeContainer = styled.div`
  .category-tree-label {
    display: flex;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.25rem;
    margin-bottom: 0.25rem;

    ${({ theme, categoryStatus }) =>
      (categoryStatus === 'incomplete' &&
        css`
          background-color: ${theme.reqIncompleteBgColor};
          color: ${theme.reqIncompleteTextColor};
        `) ||
      (categoryStatus === 'complete' &&
        css`
          background-color: ${theme.reqCompleteBgColor};
          color: ${theme.reqCompleteTextColor};
        `) ||
      (categoryStatus === 'neutral' &&
        css`
          background-color: ${theme.reqNeutralBgColor};
          color: ${theme.reqNeutralTextColor};
        `)}
  }
`;

const ReqCategoryTree = (props) => {
  const { children, requirement, onChange } = props;
  const [isCollapsed, setIsCollapsed] = useState(false);

  const getCategoryStatus = () => {
    if (isReqNeutral(requirement)) return 'neutral';
    else if (isReqComplete(requirement)) return 'complete';
    else return 'incomplete';
  };

  return (
    <CategoryTreeContainer categoryStatus={getCategoryStatus()}>
      <TreeView
        itemClassName="category-tree-label"
        nodeLabel={
          <ReqCategoryLabel
            requirement={requirement}
            onChange={onChange}
            onClick={() => setIsCollapsed(!isCollapsed)}
          />
        }
        collapsed={isCollapsed}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {children}
      </TreeView>
    </CategoryTreeContainer>
  );
};

export default ReqCategoryTree;
