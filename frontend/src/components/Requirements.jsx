import React, { useEffect, useCallback, useRef, useState } from 'react';
import { apiFetch } from 'utils/api';
import { bindManualHoverPopover } from 'utils/manualHoverPopover';
import 'react-treeview/react-treeview.css';
import TreeView from 'react-treeview/lib/react-treeview.js';

const REQUIREMENTS_POPOVER_CLEANUP_KEY = '__tigerpathReqPopoverCleanup';
const TREE_ITEM_CLICK_HANDLER_KEY = '__tigerpathTreeItemClickHandler';

export default function Requirements({ onChange, requirements, schedule }) {
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  const makeNodesClickable = useCallback(() => {
    if (!containerRef.current) return;
    const items = containerRef.current.querySelectorAll('.tree-view_item');
    items.forEach((item) => {
      const existingHandler = item[TREE_ITEM_CLICK_HANDLER_KEY];
      if (typeof existingHandler === 'function') {
        item.removeEventListener('click', existingHandler);
      }

      const clickHandler = (event) => {
        const interactiveTarget = event.target.closest(
          'li.settled, li.unsettled, a, button, input, select, textarea'
        );
        if (interactiveTarget) return;

        const arrowCollapsedClass = 'tree-view_arrow-collapsed';
        const treeCollapsedClass = 'tree-view_children-collapsed';
        const arrowItem = item.querySelector('.tree-view_arrow');
        if (!arrowItem) return;

        if (arrowItem.classList.contains(arrowCollapsedClass)) {
          arrowItem.classList.remove(arrowCollapsedClass);
          const children = item.parentElement.querySelector('.tree-view_children');
          if (children) children.classList.remove(treeCollapsedClass);
        } else {
          arrowItem.classList.add(arrowCollapsedClass);
          const children = item.parentElement.querySelector('.tree-view_children');
          if (children) children.classList.add(treeCollapsedClass);
        }
      };

      item[TREE_ITEM_CLICK_HANDLER_KEY] = clickHandler;
      item.addEventListener('click', clickHandler);
    });
  }, []);

  const addReqPopovers = useCallback(() => {
    if (!containerRef.current) return;
    const Popover = window.bootstrap?.Popover;
    if (!Popover) return;

    const reqLabels = containerRef.current.querySelectorAll('.reqLabel');
    reqLabels.forEach((reqLabel) => {
      const existingCleanup = reqLabel[REQUIREMENTS_POPOVER_CLEANUP_KEY];
      if (typeof existingCleanup === 'function') {
        existingCleanup();
      }

      // Dispose existing popover if any
      const existing = Popover.getInstance(reqLabel);
      if (existing) existing.dispose();

      const popoverInstance = new Popover(reqLabel, {
        trigger: 'manual',
        html: true,
        animation: true,
        placement: 'left',
        fallbackPlacements: ['left'],
        boundary: 'viewport',
        template:
          '<div class="popover req-popover" role="tooltip"><div class="popover-arrow"></div><h3 class="popover-header"></h3><div class="popover-body"></div></div>',
        sanitize: false,
      });

      const cleanupHoverBehavior = bindManualHoverPopover(
        reqLabel,
        popoverInstance,
        {
          onShow: (popoverEl) => {
            if (!popoverEl) return;
            const reqPath = reqLabel.getAttribute('reqpath');
            popoverEl.querySelectorAll('.searchByReq').forEach((btn) => {
              btn.onclick = () => {
                if (reqPath) getReqCourses(reqPath);
                popoverInstance.hide();
              };
            });
          },
        }
      );

      reqLabel[REQUIREMENTS_POPOVER_CLEANUP_KEY] = () => {
        cleanupHoverBehavior();
        popoverInstance.dispose();
        delete reqLabel[REQUIREMENTS_POPOVER_CLEANUP_KEY];
      };
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getReqCourses = (req_path) => {
    const searchQueryLabel = 'Satisfying: ' + req_path.split('//').pop();
    onChange('searchQuery', searchQueryLabel);
    setLoading(true);
    apiFetch('/api/v1/get_req_courses/' + req_path.replace(/\/\//g, '$'))
      .then((results) => {
        onChange('searchResults', results);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (requirements) {
      // Use requestAnimationFrame to ensure DOM is rendered
      requestAnimationFrame(() => {
        makeNodesClickable();
        addReqPopovers();
      });
    }
  }, [requirements, makeNodesClickable, addReqPopovers]);

  const toggleSettle = (course, pathTo, settle) => {
    let pathToType = pathTo.split('//', 3).join('//');
    let newSchedule = schedule.slice();

    semLoop: for (let sem_num = 0; sem_num < newSchedule.length; sem_num++) {
      for (
        let course_index = 0;
        course_index < newSchedule[sem_num].length;
        course_index++
      ) {
        let scheduleCourse = newSchedule[sem_num][course_index];

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

    onChange('schedule', newSchedule);
  };

  const populateReqTree = (reqTree) => {
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

      let tag = '';
      if (requirement['min_needed'] === 0) tag = requirement['count'];
      else tag = requirement['count'] + '/' + requirement['min_needed'];

      let popoverContent =
        '<button type="button" class="btn btn-light btn-sm btn-block searchByReq"><i class="fa fa-search"></i>Find Satisfying Courses</button>';
      popoverContent += '<div class="popoverContentContainer">';
      if (requirement.explanation) {
        popoverContent +=
          '<p>' + requirement.explanation.split('\n').join('<br>') + '</p>';
      }
      popoverContent += '</div>';

      let reqLabel = (
        <div
          className="reqLabel"
          reqpath={requirement['path_to']}
          title={'<span>' + requirement['name'] + '</span>'}
          data-bs-content={popoverContent}
        >
          <span className="reqName">{requirement['name']}</span>
          <span className="reqCount">{tag}</span>
        </div>
      );

      if ('req_list' in requirement) {
        return (
          <TreeView key={index} nodeLabel={reqLabel} itemClassName={finished}>
            {populateReqTree(requirement)}
          </TreeView>
        );
      } else {
        return (
          <TreeView key={index} itemClassName={finished} nodeLabel={reqLabel}>
            {requirement['settled'] &&
              requirement['settled'].map((course, idx) => {
                return (
                  <li
                    key={idx}
                    className="settled"
                    onClick={() => {
                      toggleSettle(course, requirement['path_to'], false);
                    }}
                  >
                    {course}
                  </li>
                );
              })}
            {requirement['unsettled'] &&
              requirement['unsettled'].map((course, idx) => {
                return (
                  <li
                    key={idx}
                    className="unsettled text-muted"
                    onClick={() => {
                      toggleSettle(course, requirement['path_to'], true);
                    }}
                  >
                    {course}{' '}
                    <i
                      className="fa fa-exclamation-circle"
                      title="This course could satisfy multiple requirements. Click to settle it here."
                    ></i>
                  </li>
                );
              })}
          </TreeView>
        );
      }
    });
  };

  const renderRequirements = () => {
    return requirements.map((mainReq, index) => {
      let name;
      let content;
      let finished = '';
      let popoverContent;

      if (typeof mainReq === 'object') {
        name = mainReq.name;
        content = populateReqTree(mainReq);

        if (
          (mainReq['min_needed'] === 0 && mainReq['count'] >= 0) ||
          (mainReq['min_needed'] > 0 &&
            mainReq['count'] >= mainReq['min_needed'])
        ) {
          finished = 'req-done';
        }
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
      } else {
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

      let mainReqLabel = (
        <div
          className="reqLabel"
          title={'<span>' + name + '</span>'}
          data-bs-content={popoverContent}
        >
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

  return (
    <div id="requirements" ref={containerRef}>
      {!requirements && (
        <p className="text-muted p-2 mb-0">Loading requirements...</p>
      )}
      {requirements && requirements.length === 0 && (
        <p className="text-muted p-2 mb-0">
          Set your major in Settings to see requirement progress.
        </p>
      )}
      {requirements && requirements.length > 0 && renderRequirements()}
    </div>
  );
}
