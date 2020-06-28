import React, { Component } from 'react';
import $ from 'jquery';
import 'react-treeview/react-treeview.css';
import TreeView from 'react-treeview/lib/react-treeview.js';
import ReqCategory from './ReqCategory';

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
            <ReqCategory
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
      let popoverContent;

      // major is supported
      if (typeof mainReq === 'object') {
        name = mainReq.name;
        content = this.populateReqTree(mainReq);

        // whether or not the major requirements have been satisfied
        if (
          (mainReq['min_needed'] === 0 && mainReq['count'] >= 0) ||
          (mainReq['min_needed'] > 0 &&
            mainReq['count'] >= mainReq['min_needed'])
        ) {
          finished = 'req-done';
        }
        // popover
        popoverContent = '<div class="popoverContentContainer">';
        if (mainReq.explanation) {
          popoverContent +=
            '<p>' + mainReq.explanation.split('\n').join('<br>') + '</p>';
        } else if (mainReq.description) {
          popoverContent +=
            '<p>' + mainReq.description.split('\n').join('<br>') + '</p>';
        }
        if (mainReq.contacts) {
          popoverContent += '<h6>Contacts:</h6>';
          mainReq.contacts.forEach((contact) => {
            popoverContent +=
              '<p>' +
              contact.type +
              ':<br>' +
              contact.name +
              '<br><a href="mailto:' +
              contact.email +
              '">' +
              contact.email +
              '</a></p>';
          });
        }
        if (mainReq.urls) {
          popoverContent += '<h6>Reference Links:</h6>';
          mainReq.urls.forEach((url) => {
            popoverContent +=
              '<p><a href="' +
              url +
              '" class="ref-link" target="_blank" rel="noopener noreferrer">' +
              url +
              '</a></p>';
          });
        }
        popoverContent += '</div>';
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
        popoverContent = 'The ' + name + ' major is not supported yet.';
      }

      // render requirements
      let mainReqLabel = (
        <div
          className="reqLabel"
          title={'<span>' + name + '</span>'}
          data-content={popoverContent}
        >
          <div className="my-arrow root-arrow"></div>
          {name}
        </div>
      );
      return (
        <TreeView
          key={index}
          itemClassName={'tree-root ' + finished}
          childrenClassName="tree-sub-reqs"
          nodeLabel={mainReqLabel}
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
