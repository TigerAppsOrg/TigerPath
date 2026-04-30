import React, { useEffect, useRef, useState } from 'react';
import { convertSemToTermCode } from 'utils/SemesterUtils';
import 'styles/CourseDetailPanel.css';

const BASE_COURSE_OFFERINGS_URL = 'https://www.princetoncourses.com/course/';

const DIST_NAMES = {
  HA:  'Historical Analysis',
  CD:  'Culture and Difference',
  EC:  'Epistemology and Cognition',
  EM:  'Ethical Thought and Moral Values',
  LA:  'Literature and the Arts',
  SA:  'Social Analysis',
  QCR: 'Quantitative and Computational Reasoning',
  SEL: 'Science and Engineering with Lab',
  SEN: 'Science and Engineering without Lab',
};

// Interpolates a colour across the same red/orange/yellow/green scale
// that PrincetonCourses uses (ratings out of 5).
function getRatingColor(rating) {
  if (rating == null) return 'var(--tp-panel-tag-code-fill)';
  const stops = [
    [0,   [224, 82,  82 ]],
    [2,   [224, 112, 48 ]],
    [3,   [224, 144, 32 ]],
    [3.5, [200, 176, 32 ]],
    [4,   [144, 176, 32 ]],
    [4.5, [92,  184, 92 ]],
    [5,   [45,  176, 45 ]],
  ];
  const r = Math.max(0, Math.min(5, rating));
  let lo = stops[0], hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (r >= stops[i][0] && r <= stops[i + 1][0]) { lo = stops[i]; hi = stops[i + 1]; break; }
  }
  const t = hi[0] === lo[0] ? 0 : (r - lo[0]) / (hi[0] - lo[0]);
  const c = lo[1].map((v, i) => Math.round(v + t * (hi[1][i] - v)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export default function CourseDetailPanel({ course, isOpen, onClose }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const panelRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key === 'Tab') {
        const focusable = panelRef.current?.querySelectorAll(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const activeItems = Array.from(focusable ?? []).filter(
          (item) => item instanceof HTMLElement && item.offsetParent !== null
        );
        if (activeItems.length === 0) {
          event.preventDefault();
          panelRef.current?.focus();
          return;
        }
        const firstItem = activeItems[0];
        const lastItem = activeItems[activeItems.length - 1];
        if (event.shiftKey && document.activeElement === firstItem) {
          event.preventDefault();
          lastItem.focus();
        } else if (!event.shiftKey && document.activeElement === lastItem) {
          event.preventDefault();
          firstItem.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocusRef.current?.isConnected) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!course || !isOpen) return undefined;
    const controller = new AbortController();
    setLoading(true);
    setDetails(null);
    setError(null);
    const courseId = course.id;
    fetch(`/api/v1/get_course_details/${encodeURIComponent(courseId)}/`, {
      credentials: 'same-origin',
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Course details request failed');
        }
        return res.json();
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setDetails(data);
          setLoading(false);
        }
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setError('Unable to load course details.');
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [course, isOpen, loadAttempt]);

  const courseLink =
    course && course.semester_list?.length > 0
      ? `${BASE_COURSE_OFFERINGS_URL}${convertSemToTermCode(
          course.semester_list[course.semester_list.length - 1]
        )}${course.id}`
      : null;

  const hasEvalData =
    details &&
    (details.offerings?.length > 0 || details.comments?.length > 0);

  return (
    <>
      {isOpen && (
        <button
          type="button"
          className="course-detail-backdrop"
          aria-label="Close course details"
          tabIndex={-1}
          onClick={onClose}
        />
      )}
      <aside
        ref={panelRef}
        className={`course-detail-panel${isOpen ? ' open' : ''}`}
        role={isOpen ? 'dialog' : undefined}
        aria-modal={isOpen ? 'true' : undefined}
        aria-hidden={!isOpen}
        aria-labelledby={isOpen && course ? 'course-detail-title' : undefined}
        aria-label={isOpen && !course ? 'Course details' : undefined}
        tabIndex={isOpen ? -1 : undefined}
      >
      {isOpen && (
        <button
          ref={closeButtonRef}
          type="button"
          className="panel-collapse-btn"
          onClick={onClose}
          aria-label="Close course details"
          title="Close panel"
        >
          <i className="fas fa-times-circle" aria-hidden="true" />
        </button>
      )}

      {isOpen && course && (
        <>
          <div className="panel-header">
            <h3 id="course-detail-title" className="panel-title">{course.title}</h3>
          </div>

          <div className="panel-tags">
            <span className="panel-tag tag-code">
              {course.name.split(' / ')[0].replace(' ', '')}
            </span>
            {details?.has_pdf && <span className="panel-tag tag-pdf">PDF</span>}
            {details?.dists?.map((dist) => (
              <span key={dist} className="panel-tag tag-dist" title={DIST_NAMES[dist] ?? dist}>{dist}</span>
            ))}
            {courseLink && (
              <a
                href={courseLink}
                target="_blank"
                rel="noopener noreferrer"
                className="panel-tag tag-link"
              >
                PrincetonCourses ↗
              </a>
            )}
          </div>

          {loading && <p className="panel-loading">Loading...</p>}

          {!loading && error && (
            <div className="panel-error" role="alert">
              <p>{error}</p>
              <button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>
                Retry
              </button>
            </div>
          )}

          {!loading && !error && details && !hasEvalData && !details.description && (
            <p className="panel-no-data">No evaluation data available.</p>
          )}

          {!loading && !error && details && (
            <>
              <div className="panel-body">
                {details.offerings?.length > 0 && (
                  <div className="panel-section">
                    <div className="panel-section-label">Past Ratings</div>
                    <div className="panel-card">
                      <div className="offerings-table-scroll">
                        <table className="offerings-table">
                          <tbody>
                            {details.offerings.map((offering, i) => (
                              <tr key={i}>
                                <td className="offering-sem">{offering.semester}</td>
                                <td
                                  className="offering-professors"
                                >
                                  {offering.professors}
                                </td>
                                <td>
                                  <span
                                    className="offering-rating"
                                    style={{
                                      background: getRatingColor(offering.rating),
                                      color: offering.rating != null
                                        ? 'var(--tp-panel-rating-text)'
                                        : 'var(--tp-panel-muted)',
                                    }}
                                  >
                                    {offering.rating != null ? offering.rating.toFixed(2) : 'N/A'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {details.description && (
                  <div className="panel-section">
                    <div className="panel-section-label">Description</div>
                    <div className="panel-card">
                      <p className="panel-description-text">{details.description}</p>
                    </div>
                  </div>
                )}

                {details.comments?.length > 0 && (
                  <div className="panel-section panel-section-comments">
                    <div className="panel-section-label">
                      Student Comments
                      {details.comments_semester && (
                        <span className="comments-from">(From {details.comments_semester})</span>
                      )}
                    </div>
                    <div className="panel-comments">
                      {details.comments.map((comment, i) => (
                        <div key={i} className="comment-card">
                          {comment}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
      </aside>
    </>
  );
}
