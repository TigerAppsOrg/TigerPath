import React from 'react';

export default function SearchCourseCard({ course }) {
  return (
    <div
      title={course['name']}
      className={`course-card search-course-pill ${course['semester']}`}
      style={{ display: 'flex', alignItems: 'center' }}
    >
      <div
        className="course-name"
        style={{ flex: 1, minWidth: 0, float: 'none', maxWidth: 'none' }}
      >
        {course['name']}
      </div>
    </div>
  );
}
