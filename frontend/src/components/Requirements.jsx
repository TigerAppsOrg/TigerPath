import React, { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import styled from 'styled-components';
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

// ── Styled components ──────────────────────────────────────────────────────────

const CardWrapper = styled.div`
  flex: ${({ $flex }) => $flex ?? 1};
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

const TabStrip = styled.div`
  display: flex;
  align-items: flex-end;
  padding: 0 8px;
  gap: 2px;
  flex-shrink: 0;
`;

const RidgeTab = styled.button`
  border: 1px solid ${({ theme }) => theme.lightGrey};
  border-bottom-color: ${({ $active }) => ($active ? 'white' : 'inherit')};
  border-radius: 6px 6px 0 0;
  background: ${({ $active, theme }) => ($active ? 'white' : theme.greySemBody)};
  color: ${({ theme }) => theme.darkGreyText};
  padding: 4px 10px;
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  cursor: pointer;
  white-space: nowrap;
  line-height: 1.4;
  position: relative;
  margin-bottom: -1px;
  z-index: 1;

  &:hover {
    background: ${({ $active, theme }) => ($active ? 'white' : theme.lightGrey)};
  }
`;

const CardInfoIcon = styled.i`
  margin-left: auto;
  margin-bottom: 4px;
  cursor: pointer;
  color: ${({ theme }) => theme.darkGreyText};
  opacity: 0.45;
  font-size: 13px;
  padding: 2px 4px;
  flex-shrink: 0;

  &:hover {
    opacity: 1;
  }
`;

const CardBody = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: white;
  border: 1px solid ${({ theme }) => theme.lightGrey};
  border-radius: 8px;
  overflow: hidden;
  position: relative;
`;

const CardContent = styled.div`
  flex: 1;
  min-height: 0;
  padding: 8px 10px;
  overflow-y: auto;
`;


// ── Component ──────────────────────────────────────────────────────────────────

export default function Requirements({ onChange, requirements, schedule }) {
  const [loading, setLoading] = useState(false); // eslint-disable-line no-unused-vars
  const containerRef = useRef(null);
  const [topTab, setTopTab] = useState('major'); // 'major' | 'degree' | 'grad'
  const [selectedMinorIndex, setSelectedMinorIndex] = useState(0);

  // Partition requirements into the top card (major + degree) and the bottom card (minors).
  //
  // The backend always produces [major, degree, ...minors] in that order.
  // Major: has a truthy `degree` field ("AB"/"BSE") — or is a plain string (unsupported major).
  // Degree req: the item immediately following the major (degree field is null).
  // Minors: everything else.
  const { topReqs, minorReqs } = useMemo(() => {
    if (!requirements) return { topReqs: [], minorReqs: [] };

    // Locate the major (first item that is a string or has a truthy degree value)
    let majorIdx = -1;
    for (let i = 0; i < requirements.length; i++) {
      const r = requirements[i];
      if (typeof r === 'string' || (typeof r === 'object' && r && r.degree)) {
        majorIdx = i;
        break;
      }
    }

    // Degree req is the item immediately after the major
    let degreeIdx = -1;
    if (majorIdx !== -1 && majorIdx + 1 < requirements.length) {
      const next = requirements[majorIdx + 1];
      if (next && typeof next === 'object' && !next.degree) {
        degreeIdx = majorIdx + 1;
      }
    }

    const topIndices = new Set([majorIdx, degreeIdx].filter((i) => i !== -1));
    return {
      topReqs: requirements.filter((_, i) => topIndices.has(i)),
      minorReqs: requirements.filter((_, i) => !topIndices.has(i)),
    };
  }, [requirements]);

  // Reset tab selections whenever the plan/requirements change
  useEffect(() => { setTopTab('major'); }, [requirements]);
  useEffect(() => {
    setSelectedMinorIndex((prev) =>
      minorReqs.length > 0 ? Math.min(prev, minorReqs.length - 1) : 0
    );
  }, [minorReqs]);

  // Short tab labels for the top card
  const majorLabel = useMemo(() => {
    const req = topReqs[0];
    if (!req) return 'Major';
    if (typeof req === 'string') return String(req).split(/[\s(]/)[0];
    if (req.code) return req.code.split('-')[0];
    if (req.name) {
      const m = req.name.match(/\(([A-Z]{2,6})[-\s)]/);
      if (m) return m[1];
      return req.name.split(' ')[0];
    }
    return 'Major';
  }, [topReqs]);

  const degreeLabel = useMemo(() => {
    // Prefer the degree field on the major object ("AB" / "BSE")
    const majorObj = topReqs.find((r) => typeof r === 'object' && 'degree' in r);
    if (majorObj?.degree) return majorObj.degree;
    const degreeObj = topReqs[1];
    if (!degreeObj || typeof degreeObj === 'string') return 'Degree';
    const match = (degreeObj.name || '').match(/\b(AB|BSE)\b/i);
    if (match) return match[0].toUpperCase();
    return (degreeObj.name || 'Degree').split(' ')[0];
  }, [topReqs]);

  const getMinorLabel = useCallback((req) => {
    if (!req) return 'Minor';
    const name = typeof req === 'object' ? (req.name || '') : String(req);
    if (typeof req === 'object' && req.code) return req.code.replace(/-.*/, '');
    const clean = name.replace(/\s*minor\s*/i, '').trim();
    const STOP = new Set(['and', 'the', 'of', 'for', 'in', 'a', 'an', 'at', 'to']);
    const words = clean.split(/\s+/).filter((w) => w && !STOP.has(w.toLowerCase()));
    return words.map((w) => w[0].toUpperCase()).join('') || 'Minor';
  }, []);

  // Split the degree req into two filtered views:
  //   AB/BSE tab  → everything except "Degree Progress"
  //   🎓 tab      → only "Degree Progress"
  const degreeReq = topReqs[1] ?? null;
  const degreeReqWithoutProgress = degreeReq
    ? { ...degreeReq, req_list: (degreeReq.req_list || []).filter((r) => r.name !== 'Degree Progress') }
    : null;
  const degreeProgressOnly = degreeReq
    ? { ...degreeReq, req_list: (degreeReq.req_list || []).filter((r) => r.name === 'Degree Progress') }
    : null;

  const selectedTopReq =
    topTab === 'major'  ? (topReqs[0] ?? null) :
    topTab === 'degree' ? degreeReqWithoutProgress :
    /* grad */            degreeProgressOnly;
  const selectedMinorReq = minorReqs[selectedMinorIndex] ?? null;

  // Build info-icon data attributes for a requirement (returns null if no info available)
  const getInfoIconAttrs = (mainReq) => {
    if (!mainReq || typeof mainReq !== 'object') return null;
    const contacts = Array.isArray(mainReq.contacts) ? mainReq.contacts : [];
    const isMajor = 'degree' in mainReq;
    const urlsRaw = Array.isArray(mainReq.urls) ? mainReq.urls.filter(Boolean) : [];
    const refUrls = isMajor
      ? withFallbackMajorUrls(mainReq, urlsRaw)
      : orderMajorReferenceUrls(urlsRaw);
    if (contacts.length === 0 && !refUrls[0] && !refUrls[1]) return null;
    return {
      'data-bs-toggle': 'popover',
      'data-bs-html': 'true',
      'data-tp-info': JSON.stringify({ contacts, isMajor }),
      'data-tp-ref0': refUrls[0] || '',
      'data-tp-ref1': refUrls[1] || '',
    };
  };

  // ── DOM helpers (unchanged logic) ─────────────────────────────────────────

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
      if (typeof existingCleanup === 'function') existingCleanup();

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

      const cleanupHoverBehavior = bindManualHoverPopover(reqLabel, popoverInstance, {
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
      });

      reqLabel[REQUIREMENTS_POPOVER_CLEANUP_KEY] = () => {
        cleanupHoverBehavior();
        popoverInstance.dispose();
        delete reqLabel[REQUIREMENTS_POPOVER_CLEANUP_KEY];
      };
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addHeaderPopovers = useCallback(() => {
    if (!containerRef.current) return;
    const Popover = window.bootstrap?.Popover;
    if (!Popover) return;

    const icons = containerRef.current.querySelectorAll('.info-icon');
    icons.forEach((icon) => {
      const existingCleanup = icon[HEADER_POPOVER_CLEANUP_KEY];
      if (typeof existingCleanup === 'function') existingCleanup();

      const existing = Popover.getInstance(icon);
      if (existing) existing.dispose();

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

  const toggleSettle = (course, pathTo, settle) => {
    let pathToType = pathTo.split('//', 3).join('//');
    let newSchedule = schedule.slice();

    semLoop: for (let sem_num = 0; sem_num < newSchedule.length; sem_num++) {
      for (let course_index = 0; course_index < newSchedule[sem_num].length; course_index++) {
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
        (requirement['min_needed'] > 0 && requirement['count'] >= requirement['min_needed'])
      ) {
        finished = 'req-done';
      }
      if (requirement['count'] === 0 && requirement['min_needed'] === 0) finished = 'req-neutral';

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
        popoverContent += '<p>' + requirement.explanation.split('\n').join('<br>') + '</p>';
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
              requirement['settled'].map((course, idx) => (
                <li
                  key={idx}
                  className="settled"
                  onClick={() => toggleSettle(course, requirement['path_to'], false)}
                >
                  {course}
                </li>
              ))}
            {requirement['unsettled'] &&
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

  // Render the tree content for one requirement (no outer collapsible wrapper —
  // the card + tab row already show the name)
  const renderSingleReqContent = (mainReq) => {
    if (!mainReq) return null;

    if (typeof mainReq !== 'object') {
      const name = String(mainReq);
      return (
        <div>
          <p style={{ padding: '5px' }}>
            The {name} major is not supported yet. If you would like to request it, let us know{' '}
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

    if (!mainReq.req_list) return null;
    return <>{populateReqTree(mainReq)}</>;
  };

  // Re-bind DOM popovers and click handlers whenever visible content changes
  useEffect(() => {
    if (requirements) {
      requestAnimationFrame(() => {
        makeNodesClickable();
        addReqPopovers();
        addHeaderPopovers();
      });
    }
  }, [requirements, topTab, selectedMinorIndex, makeNodesClickable, addReqPopovers, addHeaderPopovers]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!requirements) {
    return (
      <div id="requirements" ref={containerRef}>
        <p className="text-muted p-2 mb-0">Loading requirements...</p>
      </div>
    );
  }

  if (requirements.length === 0) {
    return (
      <div id="requirements" ref={containerRef}>
        <p className="text-muted p-2 mb-0">
          Set a major in this plan&apos;s edit popup to see requirement progress.
        </p>
      </div>
    );
  }

  return (
    <div id="requirements" ref={containerRef}>
      {/* ── Top card: major + degree + graduation ── */}
      {topReqs.length > 0 && (
        <CardWrapper $flex={minorReqs.length > 0 ? 3 : 1}>
          <TabStrip>
            <RidgeTab
              type="button"
              $active={topTab === 'major'}
              onClick={() => setTopTab('major')}
            >
              {majorLabel}
            </RidgeTab>

            {topReqs.length > 1 && (
              <>
                <RidgeTab
                  type="button"
                  $active={topTab === 'degree'}
                  onClick={() => setTopTab('degree')}
                >
                  {degreeLabel}
                </RidgeTab>
                <RidgeTab
                  type="button"
                  $active={topTab === 'grad'}
                  onClick={() => setTopTab('grad')}
                  aria-label="Path to graduation"
                >
                  <i className="fas fa-graduation-cap" aria-hidden="true" />
                </RidgeTab>
              </>
            )}

            {(() => {
              const attrs = getInfoIconAttrs(selectedTopReq);
              if (!attrs) return null;
              return (
                <CardInfoIcon
                  className="fa fa-info-circle info-icon"
                  {...attrs}
                />
              );
            })()}
          </TabStrip>

          <CardBody>
            <CardContent>
              {renderSingleReqContent(selectedTopReq)}
            </CardContent>
          </CardBody>
        </CardWrapper>
      )}

      {/* ── Bottom card: one tab per minor ── */}
      {minorReqs.length > 0 && (
        <CardWrapper $flex={2}>
          <TabStrip>
            {minorReqs.map((minor, i) => (
              <RidgeTab
                key={i}
                type="button"
                $active={i === selectedMinorIndex}
                onClick={() => setSelectedMinorIndex(i)}
              >
                {getMinorLabel(minor)}
              </RidgeTab>
            ))}

            {(() => {
              const attrs = getInfoIconAttrs(selectedMinorReq);
              if (!attrs) return null;
              return (
                <CardInfoIcon
                  className="fa fa-info-circle info-icon"
                  {...attrs}
                />
              );
            })()}
          </TabStrip>

          <CardBody>
            <CardContent>
              {renderSingleReqContent(selectedMinorReq)}
            </CardContent>
          </CardBody>
        </CardWrapper>
      )}
    </div>
  );
}
