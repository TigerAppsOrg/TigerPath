import React, { useEffect, useState } from 'react';
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

// Interpolates a colour across the same red→orange→yellow→green scale
// that PrincetonCourses uses (ratings out of 5).
function getRatingColor(rating) {
  if (rating == null) return '#e0e0e0';
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

  useEffect(() => {
    if (!course) return;
    setLoading(true);
    setDetails(null);
    fetch(`/api/v1/get_course_details/${encodeURIComponent(course.id)}/`, {
      credentials: 'same-origin',
    })
      .then((res) => res.json())
      .then((data) => {
        setDetails(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [course]);

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
    <div className={`course-detail-panel${isOpen ? ' open' : ''}`}>
      <button className="panel-collapse-btn" onClick={onClose} title="Close panel">
        <i className="fas fa-times-circle" />
      </button>

      {course && (
        <>
          <div className="panel-header">
            <h3 className="panel-title">{course.title}</h3>
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

          {!loading && details && !hasEvalData && !details.description && (
            <p className="panel-no-data">No evaluation data available.</p>
          )}

          {!loading && details && (
            <>
              {/* ── Scrollable body ── */}
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
                                  onScroll={(e) => {
                                    const el = e.currentTarget;
                                    el.classList.add('is-scrolling');
                                    clearTimeout(el._scrollTimer);
                                    el._scrollTimer = setTimeout(
                                      () => el.classList.remove('is-scrolling'),
                                      800
                                    );
                                  }}
                                >
                                  {offering.professors}
                                </td>
                                <td>
                                  <span
                                    className="offering-rating"
                                    style={{
                                      background: getRatingColor(offering.rating),
                                      color: offering.rating != null ? 'white' : '#777',
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
    </div>
  );
}
