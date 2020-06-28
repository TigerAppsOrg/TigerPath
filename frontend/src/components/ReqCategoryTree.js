import React, { useState } from 'react';
import TreeView from 'react-treeview';
import ReqCategoryLabel from './ReqCategoryLabel';
import { isReqDone, isReqNeutral } from '../utils/RequirementUtils';

const ReqCategoryTree = (props) => {
  const { children, requirement, onChange } = props;
  const [isCollapsed, setIsCollapsed] = useState(false);

  const getCategoryClassName = () => {
    if (isReqNeutral(requirement)) return 'req-neutral';
    else if (isReqDone(requirement)) return 'req-done';
    else return '';
  };

  return (
    <TreeView
      itemClassName={getCategoryClassName()}
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
  );
};

export default ReqCategoryTree;
