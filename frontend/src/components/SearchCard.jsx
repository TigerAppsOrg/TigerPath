import React, { useState, useEffect } from 'react';
import SearchCourseCard from './SearchCourseCard';

// const RADIX = 10;

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

// function convertSemToReadableForm(sem) {
//   if (sem[0] === 'f') {
//     return 'Fall 20' + sem.slice(1);
//   } else {
//     return 'Spring 20' + sem.slice(1);
//   }
// }

// function getPrevOfferedSemList(semList) {
//   semList.sort(function (sem1, sem2) {
//     let yearCmp =
//       parseInt(sem1.slice(1), RADIX) - parseInt(sem2.slice(1), RADIX);
//     if (yearCmp !== 0) return yearCmp;
//     else if (sem1[0] === 's' && sem2[0] === 'f') return -1;
//     else if (sem1[0] === 'f' && sem2[0] === 's') return 1;
//     else return 0;
//   });

//   let result = '';
//   for (
//     let index = Math.max(0, semList.length - 2);
//     index < semList.length;
//     index++
//   ) {
//     result += convertSemToReadableForm(semList[index]);
//     if (index !== semList.length - 1) result += ', ';
//   }
//   return result;
// }

// function convertSemToTermCode(sem) {
//   let code = '1';
//   if (sem[0] === 'f') {
//     code += (parseInt(sem.slice(1), 10) + 1).toString() + '2';
//   } else {
//     code += sem.slice(1) + '4';
//   }
//   return code;
// }

export default function SearchCard({ course, courseKey, index: courseIndex, onSelect, isSelected }) {
  const [qualityRating, setQualityRating] = useState(null);

  useEffect(() => {
    fetch(`/api/v1/get_course_details/${encodeURIComponent(course['id'])}/`, {
      credentials: 'same-origin',
    })
      .then((res) => res.json())
      .then((data) => setQualityRating(data.quality_rating ?? null))
      .catch(() => {});
  }, [course['id']]);

  // let prevOfferedSemList = getPrevOfferedSemList(course['semester_list']);

  return (
    <div
      className={`search-card ${course['semester']}${isSelected ? ' selected' : ''}`}
      onClick={() => onSelect && onSelect(course)}
      style={{ cursor: 'pointer' }}
    >
      <>
        <SearchCourseCard
          course={course}
          courseKey={courseKey}
          courseIndex={courseIndex}
        />
        <div className="search-card-info">
          <div>
            <div className="course-title">{course['title']}</div>
            {/* <div className="course-prev-sems">{`Previously offered in ${prevOfferedSemList}`}</div> */}
          </div>
          <div className="search-card-links" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {qualityRating != null && (
              <span
                className="search-card-rating"
                style={{
                  background: getRatingColor(qualityRating),
                  color: 'white',
                  borderRadius: '3px',
                  padding: '1px 5px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  lineHeight: '1.6',
                }}
              >
                {qualityRating}
              </span>
            )}
            <button
              className="search-card-info-btn"
              title="View course details"
              onClick={(e) => { e.stopPropagation(); onSelect && onSelect(course); }}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: 'inherit',
              }}
            >
              <i className="fas fa-info-circle fa-lg fa-fw course-info" />
            </button>
          </div>
        </div>
      </>
    </div>
  );
}
