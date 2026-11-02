import React, { useEffect, useState } from 'react';
import Icon from './Icon';
import { getCourseDetails } from '../api';
import { DIST_NAMES, ratingColor } from '../helpers/ratings';
import { SEASONS, YEARS, latestTermCode } from '../helpers/schedule';

const SEMESTER_OPTIONS = YEARS.flatMap((year, y) =>
  SEASONS.map((season, s) => ({ index: y * 2 + s, label: `${year} ${season}` }))
);

export default function CourseDrawer({ course, onClose, onAdd, alreadyPlanned }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState('');

  useEffect(() => {
    if (!course) return undefined;
    const controller = new AbortController();
    setLoading(true);
    setDetails(null);
    setTarget('');
    getCourseDetails(course.id, controller.signal)
      .then((data) => {
        setDetails(data);
        setLoading(false);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setLoading(false);
      });
    return () => controller.abort();
  }, [course]);

  useEffect(() => {
    if (!course) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [course, onClose]);

  const termCode = latestTermCode(course?.semester_list);
  const hasData = details && (details.offerings?.length > 0 || details.comments?.length > 0 || details.description);

  return (
    <aside className={`tp-drawer dont-print ${course ? 'open' : ''}`} aria-hidden={!course} aria-label="Course details">
      {course && (
        <>
          <div className="tp-drawer-head">
            <h2>{course.title}</h2>
            <button type="button" className="tp-icon-btn" aria-label="Close course details" onClick={onClose}>
              <Icon name="x" size={20} />
            </button>
          </div>

          <div className="tp-tags">
            <span className="tp-tag code">{course.name.split(' / ')[0].replace(' ', '')}</span>
            {details?.has_pdf && <span className="tp-tag">PDF</span>}
            {details?.dists?.map((dist) => (
              <span key={dist} className="tp-tag" title={DIST_NAMES[dist] ?? dist}>
                {dist}
              </span>
            ))}
            {termCode && (
              <a
                className="tp-tag link"
                href={`https://www.princetoncourses.com/course/${termCode}${course.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Course Link <Icon name="external" size={12} />
              </a>
            )}
          </div>

          <form
            className="tp-add-to-plan"
            onSubmit={(e) => {
              e.preventDefault();
              if (target !== '') onAdd(course, Number(target));
            }}
          >
            <select
              className="tp-select"
              value={target}
              aria-label="Semester to add this course to"
              onChange={(e) => setTarget(e.target.value)}
              disabled={alreadyPlanned}
            >
              <option value="">{alreadyPlanned ? 'Already in this plan' : 'Add to semester...'}</option>
              {SEMESTER_OPTIONS.map((o) => (
                <option key={o.index} value={o.index}>
                  {o.label}
                </option>
              ))}
            </select>
            <button type="submit" className="tp-btn tp-btn-save tp-btn-sm" disabled={target === '' || alreadyPlanned}>
              Add
            </button>
          </form>

          {loading && <p className="tp-empty">Loading...</p>}
          {!loading && details && !hasData && <p className="tp-empty">No evaluation data available.</p>}

          {!loading && details && (
            <div className="tp-drawer-body">
              {details.offerings?.length > 0 && (
                <section>
                  <h3>Past Ratings</h3>
                  <table className="tp-offerings">
                    <tbody>
                      {details.offerings.map((o, i) => (
                        <tr key={i}>
                          <td>{o.semester}</td>
                          <td className="tp-offering-profs">{o.professors}</td>
                          <td>
                            <span
                              className="tp-rating"
                              style={{ background: ratingColor(o.rating), color: o.rating != null ? '#fff' : '#777' }}
                            >
                              {o.rating != null ? o.rating.toFixed(2) : 'N/A'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}
              {details.description && (
                <section>
                  <h3>Description</h3>
                  <p>{details.description}</p>
                </section>
              )}
              {details.comments?.length > 0 && (
                <section>
                  <h3>
                    Student Comments{' '}
                    {details.comments_semester && (
                      <span className="tp-muted">(From {details.comments_semester})</span>
                    )}
                  </h3>
                  {details.comments.map((comment, i) => (
                    <blockquote key={i} className="tp-comment">
                      {comment}
                    </blockquote>
                  ))}
                </section>
              )}
            </div>
          )}
        </>
      )}
    </aside>
  );
}
