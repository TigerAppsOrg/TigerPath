import React, { useEffect, useCallback, useRef, useState } from 'react';
import { apiFetch } from 'utils/api';
import { bindManualHoverPopover } from 'utils/manualHoverPopover';
import 'react-treeview/react-treeview.css';
import TreeView from 'react-treeview/lib/react-treeview.js';

const REQUIREMENTS_POPOVER_CLEANUP_KEY = '__tigerpathReqPopoverCleanup';
const HEADER_POPOVER_CLEANUP_KEY = '__tigerpathHeaderPopoverCleanup';
const TREE_ITEM_CLICK_HANDLER_KEY = '__tigerpathTreeItemClickHandler';

function escapeHref(url) {
  return String(url).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Map YAML `urls` to [UA major offerings, department site] when both exist. */
function orderMajorReferenceUrls(urls) {
  if (!Array.isArray(urls) || urls.length < 2) return urls;
  const ua = urls.find((u) => /ua\.princeton\.edu/i.test(String(u)));
  const nonUa = urls.find((u) => !/ua\.princeton\.edu/i.test(String(u)));
  if (ua && nonUa) return [ua, nonUa];
  return urls;
}

const COS_REFERENCE_URLS = [
  'https://ua.princeton.edu/fields-study/departmental-majors-degree-bachelor-arts/computer-science',
  'https://www.cs.princeton.edu/',
];

/** Ensures majors show reference links when YAML/API omits urls (COS was missing this until recently). */
function withFallbackMajorUrls(mainReq, urlsRaw) {
  let urls = Array.isArray(urlsRaw) ? urlsRaw.filter(Boolean) : [];
  if (!mainReq || !('degree' in mainReq)) return urls;
  urls = orderMajorReferenceUrls(urls);
  if (urls.length >= 2) return urls;
  const code = String(mainReq.code || '').toUpperCase();
  if (code === 'COS-AB' || code === 'COS-BSE') return COS_REFERENCE_URLS.slice();
  return urls;
}

const MAJOR_LINK_LABELS = ['Major Offerings', 'Department Site'];
const DEGREE_LINK_LABELS = ['Program Overview', 'General Education Requirements'];

function shortenContactRole(role) {
  if (!role) return '';
  return role
    .replace(/Director of Undergraduate Studies for (Majors?)/i, 'DUS ($1)')
    .replace(/Director of Undergraduate Studies for .*/i, 'DUS (pre-majors & abroad)')
    .replace(/Undergraduate Studies Program Manager/i, 'Program Manager')
    .replace(/Placement Officer/i, 'Placement Officer');
}

/**
 * Build popover HTML from structured data. Do not put this HTML in a `data-bs-content`
 * attribute — long strings with many quotes break attribute parsing in the browser.
 */
function buildHeaderPopoverHtml(info) {
  const contacts = Array.isArray(info.contacts) ? info.contacts : [];
  const isMajor = Boolean(info.isMajor);
  const urls = [
    (info.ref0 != null && info.ref0 !== '' ? String(info.ref0) : '') ||
      (Array.isArray(info.urls) ? info.urls[0] || '' : ''),
    (info.ref1 != null && info.ref1 !== '' ? String(info.ref1) : '') ||
      (Array.isArray(info.urls) ? info.urls[1] || '' : ''),
  ];

  let html = '<div class="info-popover-content">';

  if (contacts.length > 0) {
    html += '<div class="info-card">';
    html += '<div class="info-card-title">Contacts:</div>';
    contacts.forEach((c) => {
      html += '<div class="info-contact">';
      if (c.type) {
        html += '<span class="contact-role">' + escapeHtml(shortenContactRole(c.type)) + ':</span>';
      }
      html += '<div class="contact-name">' + escapeHtml(c.name || '') + '</div>';
      if (c.email) {
        html +=
          '<a href="mailto:' +
          escapeHtml(c.email) +
          '" class="contact-email">' +
          escapeHtml(c.email) +
          '</a>';
      }
      html += '</div>';
    });
    html += '</div>';
  }

  if (isMajor || urls[0] || urls[1]) {
    const labels = isMajor ? MAJOR_LINK_LABELS : DEGREE_LINK_LABELS;
    html += '<div class="info-card">';
    html += '<div class="info-card-title">Reference links:</div>';
    labels.forEach((label, i) => {
      const url = urls[i] || '';
      if (url) {
        html +=
          '<a href="' +
          escapeHref(url) +
          '" class="ref-link-item" target="_blank" rel="noopener noreferrer">' +
          escapeHtml(label) +
          '</a>';
      } else if (isMajor) {
        html +=
          '<div class="ref-link-item ref-link-item-disabled">' + escapeHtml(label) + '</div>';
      }
    });
    html += '</div>';
  }

  if (contacts.length === 0 && !urls[0] && !urls[1]) {
    html +=
      '<div class="info-card"><p class="text-muted small mb-0">No information available for this program.</p></div>';
  }

  html += '</div>';
  return html;
}

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

      const cleanupHoverBehavior = bindManualHoverPopover(
        reqLabel,
        popoverInstance,
        {
          hideDelayMs: 0,
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

      // Prefer JSON in data-tp-info — long HTML in data-bs-content breaks when the browser
      // truncates or mangles quoted attributes, which drops real <a href> links.
      let popoverBodyHtml = '';
      const structured = icon.getAttribute('data-tp-info');
      const ref0 = icon.getAttribute('data-tp-ref0') || '';
      const ref1 = icon.getAttribute('data-tp-ref1') || '';
      if (structured) {
        try {
          const parsed = JSON.parse(structured);
          popoverBodyHtml = buildHeaderPopoverHtml({
            ...parsed,
            ref0: ref0 || parsed.ref0,
            ref1: ref1 || parsed.ref1,
          });
        } catch (e) {
          popoverBodyHtml = icon.getAttribute('data-bs-content') || '';
        }
      } else {
        popoverBodyHtml = icon.getAttribute('data-bs-content') || '';
      }

      const popoverInstance = new Popover(icon, {
        trigger: 'manual',
        html: true,
        animation: false,
        placement: 'left',
        fallbackPlacements: ['left', 'top', 'bottom'],
        boundary: 'viewport',
        content: popoverBodyHtml,
        template:
          '<div class="popover info-popover" role="tooltip"><div class="popover-arrow"></div><div class="popover-body p-0"></div></div>',
        sanitize: false,
      });

      // Small delay lets the cursor move from the icon onto the popover without it closing.
      const cleanupHover = bindManualHoverPopover(icon, popoverInstance, {
        hideDelayMs: 150,
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

      let tag = '';
      if (requirement['min_needed'] === 0) tag = requirement['count'];
      else tag = requirement['count'] + '/' + requirement['min_needed'];
      if (isOrGroup && finished !== 'req-done') tag += ' (any 1)';

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
        let childTree = requirement;
        if (isOrGroup && finished === 'req-done') {
          const satisfiedChildren = requirement['req_list'].filter(
            (r) => r['count'] >= r['min_needed']
          );
          if (satisfiedChildren.length > 0) {
            childTree = { ...requirement, req_list: satisfiedChildren };
          }
        }
        return (
          <TreeView key={index} nodeLabel={reqLabel} itemClassName={finished}>
            {populateReqTree(childTree)}
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
      let headerInfoPayload = null;
      /** Reference URLs for popover (separate data attrs so hrefs are never dropped from JSON). */
      let refUrls = [];

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
        const contacts = Array.isArray(mainReq.contacts) ? mainReq.contacts : [];
        // Major trees have a "degree" field; degree trees (AB/BSE) do not.
        const isMajor = 'degree' in mainReq;
        const urlsRaw = Array.isArray(mainReq.urls) ? mainReq.urls.filter(Boolean) : [];
        refUrls = isMajor
          ? withFallbackMajorUrls(mainReq, urlsRaw)
          : orderMajorReferenceUrls(urlsRaw);

        headerInfoPayload = { contacts, isMajor };
        popoverContent = '';
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
          <span className="reqLabel-main-title">{name}</span>
          <i
            className="fa fa-info-circle info-icon"
            data-bs-toggle="popover"
            data-bs-html="true"
            {...(headerInfoPayload
              ? {
                  'data-tp-info': JSON.stringify(headerInfoPayload),
                  'data-tp-ref0': refUrls[0] || '',
                  'data-tp-ref1': refUrls[1] || '',
                }
              : { 'data-bs-content': popoverContent })}
            style={{ cursor: 'pointer', padding: '4px' }}
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
          Set a major in this plan’s edit popup to see requirement progress.
        </p>
      )}
      {requirements && requirements.length > 0 && renderRequirements()}
    </div>
  );
}
