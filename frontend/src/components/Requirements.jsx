import React, { useEffect, useCallback, useRef, useState } from 'react';
import { apiFetch, apiPost } from 'utils/api';
import { bindManualHoverPopover } from 'utils/manualHoverPopover';
import 'react-treeview/react-treeview.css';
import TreeView from 'react-treeview/lib/react-treeview.js';

const REQUIREMENTS_POPOVER_CLEANUP_KEY = '__tigerpathReqPopoverCleanup';
const HEADER_POPOVER_CLEANUP_KEY = '__tigerpathHeaderPopoverCleanup';
const TREE_ITEM_CLICK_HANDLER_KEY = '__tigerpathTreeItemClickHandler';

function escapeHref(url) {
  return String(url).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

export default function Requirements({ onChange, requirements, schedule }) {
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const popoverInstancesRef = useRef({}); // path_to -> popover instance
  const editTriggerRef = useRef(null);    // path_to to auto-open edit form on next popover show
  const saveOverrideRef = useRef(null);

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

    const reqLabels = containerRef.current.querySelectorAll(
      '.reqLabel:not(.reqLabel-main)'
    );
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

      const reqPath = reqLabel.getAttribute('reqpath');
      if (reqPath) {
        popoverInstancesRef.current[reqPath] = popoverInstance;
      }

      const showEditForm = (popoverEl) => {
        const defaultView = popoverEl.querySelector('.req-popover-default');
        const editView = popoverEl.querySelector('.req-popover-edit');
        if (defaultView) defaultView.style.display = 'none';
        if (editView) editView.style.display = 'block';
      };

      const cleanupHoverBehavior = bindManualHoverPopover(
        reqLabel,
        popoverInstance,
        {
          hideDelayMs: 0,
          onShow: (popoverEl) => {
            if (!popoverEl) return;

            // Auto-open edit form if triggered from the "Overridden" pencil
            if (editTriggerRef.current && editTriggerRef.current === reqPath) {
              editTriggerRef.current = null;
              requestAnimationFrame(() => showEditForm(popoverEl));
            }

            popoverEl.querySelectorAll('.searchByReq').forEach((btn) => {
              btn.onclick = () => {
                if (reqPath) getReqCourses(reqPath);
                popoverInstance.hide();
              };
            });

            popoverEl.querySelectorAll('.editOverrideBtn').forEach((btn) => {
              btn.onclick = () => showEditForm(popoverEl);
            });

            popoverEl.querySelectorAll('.cancelOverrideBtn').forEach((btn) => {
              btn.onclick = () => {
                const defaultView = popoverEl.querySelector('.req-popover-default');
                const editView = popoverEl.querySelector('.req-popover-edit');
                if (defaultView) defaultView.style.display = 'block';
                if (editView) editView.style.display = 'none';
              };
            });

            // Validation: flag count input red + show error tooltip when > max
            const countInput = popoverEl.querySelector('.overrideCountInput');
            const errorTooltip = popoverEl.querySelector('.override-error-tooltip');
            if (countInput && errorTooltip) {
              const validateCount = () => {
                const max = countInput.dataset.max ? parseInt(countInput.dataset.max, 10) : null;
                const val = parseInt(countInput.value, 10);
                const invalid = max !== null && !isNaN(val) && val > max;
                countInput.classList.toggle('is-invalid', invalid);
                errorTooltip.style.display = invalid ? 'block' : 'none';
                return !invalid;
              };
              countInput.addEventListener('input', validateCount);
            }

            popoverEl.querySelectorAll('.saveOverrideBtn').forEach((btn) => {
              btn.onclick = () => {
                const countInput = popoverEl.querySelector('.overrideCountInput');
                const max = countInput?.dataset.max ? parseInt(countInput.dataset.max, 10) : null;
                const countVal = countInput ? parseInt(countInput.value, 10) : 0;
                if (max !== null && countVal > max) return; // block save when invalid
                const notesInput = popoverEl.querySelector('.overrideNotesInput');
                const notesVal = notesInput ? notesInput.value : '';
                if (reqPath && saveOverrideRef.current) {
                  saveOverrideRef.current(reqPath, countVal, notesVal);
                }
                popoverInstance.hide();
              };
            });

            popoverEl.querySelectorAll('.removeOverrideBtn').forEach((btn) => {
              btn.onclick = () => {
                if (reqPath && saveOverrideRef.current) {
                  saveOverrideRef.current(reqPath, null, '');
                }
                popoverInstance.hide();
              };
            });
          },
        }
      );

      reqLabel[REQUIREMENTS_POPOVER_CLEANUP_KEY] = () => {
        cleanupHoverBehavior();
        popoverInstance.dispose();
        if (reqPath) delete popoverInstancesRef.current[reqPath];
        delete reqLabel[REQUIREMENTS_POPOVER_CLEANUP_KEY];
      };
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Main-req info icon: manual trigger + shared hover bridge so the popover stays
  // open while moving the pointer onto links (Bootstrap hover trigger closes in the gap).
  const addHeaderPopovers = useCallback(() => {
    if (!containerRef.current) return;
    const Popover = window.bootstrap?.Popover;
    if (!Popover) return;

    const icons = containerRef.current.querySelectorAll('.info-icon');

    icons.forEach((icon) => {
      const existingCleanup = icon[HEADER_POPOVER_CLEANUP_KEY];
      if (typeof existingCleanup === 'function') {
        existingCleanup();
      }

      const existing = Popover.getInstance(icon);
      if (existing) existing.dispose();

      const popoverInstance = new Popover(icon, {
        trigger: 'manual',
        html: true,
        animation: true,
        placement: 'left',
        fallbackPlacements: ['left', 'top', 'bottom'],
        boundary: 'viewport',
        template:
          '<div class="popover req-popover" role="tooltip"><div class="popover-arrow"></div><h3 class="popover-header"></h3><div class="popover-body"></div></div>',
        sanitize: false,
      });

      const cleanupHover = bindManualHoverPopover(icon, popoverInstance, {
        hideDelayMs: 400,
      });

      icon[HEADER_POPOVER_CLEANUP_KEY] = () => {
        cleanupHover();
        popoverInstance.dispose();
        delete icon[HEADER_POPOVER_CLEANUP_KEY];
      };
    });
  }, []);

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

  const saveOverride = useCallback((pathTo, count, notes) => {
    const data = { path_to: pathTo, notes: notes || '' };
    data.count = count !== null ? String(count) : '';
    apiPost('/api/v1/set_req_override/', data).then((rawResults) => {
      const processed = rawResults.map((mainReq) => {
        if (!Array.isArray(mainReq)) return mainReq;
        return mainReq[2];
      });
      onChange('requirements', processed);
    });
  }, [onChange]);

  useEffect(() => {
    saveOverrideRef.current = saveOverride;
  }, [saveOverride]);

  useEffect(() => {
    if (requirements) {
      // Use requestAnimationFrame to ensure DOM is rendered
      requestAnimationFrame(() => {
        makeNodesClickable();
        addReqPopovers();
        addHeaderPopovers();
      });
    }
  }, [requirements, makeNodesClickable, addReqPopovers, addHeaderPopovers]);

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

      const isOrGroup =
        'req_list' in requirement &&
        requirement['min_needed'] === 1 &&
        requirement['req_list'].length > 1;

      const override = requirement['override'] || null;

      // Cap display count at min_needed when overridden and over the limit
      let displayCount = requirement['count'];
      if (override && requirement['min_needed'] > 0) {
        displayCount = Math.min(requirement['count'], requirement['min_needed']);
      }

      let tag = '';
      if (requirement['min_needed'] === 0) tag = displayCount;
      else tag = displayCount + '/' + requirement['min_needed'];
      if (isOrGroup && finished !== 'req-done') tag += ' (any 1)';

      // Build popover: two panels — default view and edit form
      const existingOverrideCount = override ? override.count : 0;
      const existingOverrideNotes = override ? (override.notes || '') : '';

      const minNeeded = requirement['min_needed'];

      let popoverContent = '<div class="req-popover-default">';
      popoverContent +=
        '<button type="button" class="req-action-btn searchByReq"><i class="fa fa-search req-action-icon"></i><span>Find satisfying courses</span></button>';
      popoverContent +=
        '<button type="button" class="req-action-btn req-action-btn--edit editOverrideBtn"><i class="fa fa-pencil req-action-icon"></i><span>Edit requirements satisfied</span></button>';
      if (requirement.explanation) {
        popoverContent +=
          '<div class="popoverContentContainer"><p>' +
          requirement.explanation.split('\n').join('<br>') +
          '</p></div>';
      }
      popoverContent += '</div>';

      popoverContent += '<div class="req-popover-edit" style="display:none">';
      popoverContent +=
        '<div class="mb-2"><label class="form-label small mb-1">Override count</label>' +
        '<div class="override-input-wrap">' +
        '<input type="number" class="form-control form-control-sm overrideCountInput" min="0"' +
        (minNeeded > 0 ? ' data-max="' + minNeeded + '"' : '') +
        ' value="' + existingOverrideCount + '">' +
        '<div class="override-error-tooltip" style="display:none">Please enter a valid number of satisfied requirements.</div>' +
        '</div></div>';
      popoverContent +=
        '<div class="mb-2"><label class="form-label small mb-1">Notes (optional)</label>' +
        '<textarea class="form-control form-control-sm overrideNotesInput" rows="2">' +
        existingOverrideNotes.replace(/</g, '&lt;').replace(/>/g, '&gt;') +
        '</textarea></div>';
      popoverContent += '<div class="d-flex gap-1">';
      popoverContent +=
        '<button type="button" class="btn btn-primary btn-sm saveOverrideBtn">Save</button>';
      popoverContent +=
        '<button type="button" class="btn btn-secondary btn-sm cancelOverrideBtn">Cancel</button>';
      if (override) {
        popoverContent +=
          '<button type="button" class="btn btn-outline-danger btn-sm removeOverrideBtn">Remove</button>';
      }
      popoverContent += '</div></div>';

      const tagEl = <span className="reqCount">{tag}</span>;

      let reqLabel = (
        <div
          className="reqLabel"
          reqpath={requirement['path_to']}
          title={'<span>' + requirement['name'] + '</span>'}
          data-bs-content={popoverContent}
        >
          <span className="reqName">{requirement['name']}</span>
          {tagEl}
        </div>
      );

      if ('req_list' in requirement) {
        let childTree = requirement;
        if (isOrGroup && finished === 'req-done') {
          const satisfiedChildren = requirement['req_list'].filter(
            (r) => r['count'] >= r['min_needed']
          );
          if (satisfiedChildren.length > 0) {
            childTree = { ...requirement, req_list: satisfiedChildren };
          }
        }
        const overriddenLeaf = override ? (
          <li
            className="settled override-label"
            onClick={() => {
              editTriggerRef.current = requirement['path_to'];
              const instance = popoverInstancesRef.current[requirement['path_to']];
              if (instance) instance.show();
            }}
          >
            Overridden ({override.count}){' '}
            <i className="fa fa-pencil" style={{ fontSize: '0.75em' }}></i>
          </li>
        ) : null;
        return (
          <TreeView key={index} nodeLabel={reqLabel} itemClassName={finished}>
            {overriddenLeaf}
            {populateReqTree(childTree)}
          </TreeView>
        );
      } else {
        const overriddenLeaf = override ? (
          <li
            className="settled override-label"
            onClick={() => {
              editTriggerRef.current = requirement['path_to'];
              const instance = popoverInstancesRef.current[requirement['path_to']];
              if (instance) instance.show();
            }}
          >
            Overridden ({override.count}){' '}
            <i className="fa fa-pencil" style={{ fontSize: '0.75em' }}></i>
          </li>
        ) : null;

        return (
          <TreeView key={index} itemClassName={finished} nodeLabel={reqLabel}>
            {overriddenLeaf}
            {!override && requirement['settled'] &&
              requirement['settled'].map((course, idx) => (
                <li
                  key={idx}
                  className="settled"
                  onClick={() => toggleSettle(course, requirement['path_to'], false)}
                >
                  {course}
                </li>
              ))}
            {!override && requirement['unsettled'] &&
              requirement['unsettled'].map((course, idx) => (
                <li
                  key={idx}
                  className="unsettled text-muted"
                  onClick={() => toggleSettle(course, requirement['path_to'], true)}
                >
                  {course}{' '}
                  <i
                    className="fa fa-exclamation-circle"
                    title="This course could satisfy multiple requirements. Click to settle it here."
                  ></i>
                </li>
              ))}
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
        const urls = Array.isArray(mainReq.urls)
          ? mainReq.urls.filter(Boolean)
          : [];
        popoverContent = '<div class="popoverContentContainer main-req-popover">';
        if (urls.length > 0) {
          const show = urls.slice(0, 2);
          const linkLabels =
            show.length === 1
              ? ['Department page']
              : ['Department page', 'More information'];
          show.forEach((url, i) => {
            popoverContent +=
              '<p class="mb-1"><a href="' +
              escapeHref(url) +
              '" class="ref-link" target="_blank" rel="noopener noreferrer">' +
              linkLabels[i] +
              '</a></p>';
          });
        } else {
          popoverContent +=
            '<p class="small mb-0 text-muted">No official program link is listed for this requirement.</p>';
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
        <div className="reqLabel reqLabel-main">
          <span>{name}</span>
          <i
            className="fa fa-info-circle info-icon"
            data-bs-toggle="popover"
            data-bs-html="true"
            data-bs-content={popoverContent}
            style={{ marginLeft: '5px', cursor: 'pointer' }}
          ></i>
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
