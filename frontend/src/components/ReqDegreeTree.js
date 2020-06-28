import React, { useState } from 'react';
import TreeView from 'react-treeview';
import ReqDegreeLabel from './ReqDegreeLabel';
import ReqCategoryTree from './ReqCategoryTree';
import ReqCourseList from './ReqCourseList';
import { isReqDone } from '../utils/RequirementUtils';

const ReqDegreeTree = (props) => {
  const { schedule, requirement, onChange } = props;
  const [isCollapsed, setIsCollapsed] = useState(false);

  const getTreeClassName = () => {
    let className = 'tree-root';
    if (typeof requirement === 'object' && isReqDone(requirement)) {
      className += ' req-done';
    }
    return className;
  };

  const populateCategoryTree = (req) => {
    return req['req_list'].map((subreq, index) => (
      <ReqCategoryTree key={index} requirement={subreq} onChange={onChange}>
        {'req_list' in subreq ? (
          populateCategoryTree(subreq)
        ) : (
          <ReqCourseList
            schedule={schedule}
            requirement={subreq}
            onChange={onChange}
          />
        )}
      </ReqCategoryTree>
    ));
  };

  return (
    <TreeView
      itemClassName={getTreeClassName()}
      childrenClassName="tree-sub-reqs"
      nodeLabel={
        <ReqDegreeLabel
          requirement={requirement}
          onClick={() => setIsCollapsed(!isCollapsed)}
        />
      }
      collapsed={isCollapsed}
      onClick={() => setIsCollapsed(!isCollapsed)}
    >
      {typeof requirement === 'object' ? (
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
  );
};

export default ReqDegreeTree;
