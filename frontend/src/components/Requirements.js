import React, { Component } from 'react';
import $ from 'jquery';
import 'react-treeview/react-treeview.css';
import TreeView from 'react-treeview/lib/react-treeview.js';
import ReqCategoryLabel from './ReqCategoryLabel';
import ReqDegreeLabel from './ReqDegreeLabel';

export default class Requirements extends Component {
  componentDidUpdate(prevProps) {
    if (this.props.requirements !== prevProps.requirements) {
      this.makeNodesClickable();
    }
  }

  // makes the entire node (not just the arrow) clickable to collapse/uncollapse a node
  // removes arrows added by library (their listeners cause bugs) and readd them
  makeNodesClickable = () => {
    // arrows kept getting deleted when updating for some reason, this makes sure they stay
    $('.tree-view_arrow').not('.my-arrow').remove();
    $('.my-arrow').addClass('tree-view_arrow');
    $('.tree-view_item').each(function () {
      $(this)
        .unbind()
        .click(function () {
          let arrowCollapsedClass = 'tree-view_arrow-collapsed';
          let treeCollapsedClass = 'tree-view_children-collapsed';
          let arrowItem = $(this).find('.tree-view_arrow');
          if (arrowItem.hasClass(arrowCollapsedClass)) {
            arrowItem.removeClass(arrowCollapsedClass);
            $(this)
              .parent()
              .find('.tree-view_children')
              .removeClass(treeCollapsedClass);
          } else {
            arrowItem.addClass(arrowCollapsedClass);
            $(this)
              .parent()
              .find('.tree-view_children')
              .addClass(treeCollapsedClass);
          }
        });
    });
  };

  // settles course and runs verifier to update
  toggleSettle = (course, pathTo, settle) => {
    let pathToType = pathTo.split('//', 3).join('//');
    let schedule = this.props.schedule.slice();

    semLoop: for (let sem_num = 0; sem_num < schedule.length; sem_num++) {
      for (
        let course_index = 0;
        course_index < schedule[sem_num].length;
        course_index++
      ) {
        let scheduleCourse = schedule[sem_num][course_index];

        if (scheduleCourse['name'] === course && !scheduleCourse['external']) {
          let settledReqTypes = scheduleCourse['settled'].map((path) =>
            path.split('//', 3).join('//')
          );
          let indexOfPathToType = settledReqTypes.indexOf(pathToType);

          if (indexOfPathToType === -1 && settle) {
            scheduleCourse['settled'].push(pathTo);
            break semLoop;
          } else if (indexOfPathToType !== -1 && !settle) {
            scheduleCourse['settled'].splice(indexOfPathToType, 1);
            break semLoop;
          }
        }
      }
    }

    this.props.onChange('schedule', schedule);
  };

  renderLeaf = (requirement) => {
    if (requirement['settled']) {
      return requirement['settled'].map((course, index) => (
        <li
          key={index}
          className="settled"
          onClick={(e) => {
            this.toggleSettle(course, requirement['path_to'], false);
          }}
        >
          {course}
        </li>
      ));
    } else {
      return requirement['unsettled'].map((course, index) => (
        <li
          key={index}
          className="unsettled text-muted"
          onClick={(e) => {
            this.toggleSettle(course, requirement['path_to'], true);
          }}
        >
          {course}{' '}
          <i
            className="fa fa-exclamation-circle"
            title="This course could satisfy multiple requirements. Click to settle it here."
          ></i>
        </li>
      ));
    }
  };

  // traverses req tree to display when updating reqlist
  populateReqTree = (reqTree) => {
    return reqTree['req_list'].map((requirement, index) => {
      let finished = '';
      if (
        (requirement['min_needed'] === 0 && requirement['count'] >= 0) ||
        (requirement['min_needed'] > 0 &&
          requirement['count'] >= requirement['min_needed'])
      ) {
        finished = 'req-done';
      }
      if (requirement['count'] === 0 && requirement['min_needed'] === 0)
        finished = 'req-neutral';

      return (
        <TreeView
          key={index}
          itemClassName={finished}
          nodeLabel={
            <ReqCategoryLabel
              requirement={requirement}
              onChange={this.props.onChange}
            />
          }
        >
          {'req_list' in requirement
            ? this.populateReqTree(requirement)
            : this.renderLeaf(requirement)}
        </TreeView>
      );
    });
  };

  requirements = () => {
    return this.props.requirements.map((mainReq, index) => {
      let name;
      let content;
      let finished = '';

      // major is supported
      if (typeof mainReq === 'object') {
        content = this.populateReqTree(mainReq);

        // whether or not the major requirements have been satisfied
        if (
          (mainReq['min_needed'] === 0 && mainReq['count'] >= 0) ||
          (mainReq['min_needed'] > 0 &&
            mainReq['count'] >= mainReq['min_needed'])
        ) {
          finished = 'req-done';
        }
      }
      // major is not supported yet
      else {
        name = mainReq;
        content = (
          <div>
            <p style={{ padding: '5px' }}>
              The {name} major is not supported yet. If you would like to
              request it, let us know{' '}
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
        );
      }

      return (
        <TreeView
          key={index}
          itemClassName={'tree-root ' + finished}
          childrenClassName="tree-sub-reqs"
          nodeLabel={<ReqDegreeLabel requirement={mainReq} />}
        >
          {content}
        </TreeView>
      );
    });
  };

  render() {
    return (
      <div id="requirements">
        {this.props.requirements && this.requirements()}
      </div>
    );
  }
}
