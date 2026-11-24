import React, { useState } from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import Icon from './Icon';
import { SEASONS, YEARS, isWrongSeason, latestTermCode } from '../helpers/schedule';
import { ratingColor } from '../helpers/ratings';

export const semesterDroppableId = (index) => `sem${index}`;

function CourseHoverCard({ course, semesterIndex, duplicate }) {
  const termCode = latestTermCode(course.semester_list);
  const wrongSeason = isWrongSeason(course, semesterIndex);
  return (
    <div className="tp-hovercard" role="tooltip">
      <div className="tp-hovercard-head">
        <strong>{course.name}</strong>
        {course.quality_rating != null && (
          <span className="tp-rating" style={{ background: ratingColor(course.quality_rating) }}>
            {Number(course.quality_rating).toFixed(2)}
          </span>
        )}
        {!course.external && termCode && (
          <a
            href={`https://www.princetoncourses.com/course/${termCode}${course.id}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open on PrincetonCourses"
          >
            <Icon name="external" size={14} />
          </a>
        )}
      </div>
      <p>{course.external ? "This is an external credit that you've added." : course.title}</p>
      {duplicate && <p className="tp-warning">This course has already been added to your schedule.</p>}
      {wrongSeason && (
        <p className="tp-warning">
          This course has previously only been offered in the {course.semester === 'fall' ? 'Fall' : 'Spring'}.
        </p>
      )}
    </div>
  );
}

/** Compare mode's right-hand board: same look, no drag-and-drop and no remove button. */
function ReadOnlyCourseChip({ course, semesterIndex, duplicate }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      className={`tp-course readonly ${isWrongSeason(course, semesterIndex) ? 'wrong-season' : ''}`}
      tabIndex={0}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      aria-label={`${course.name}${course.title ? `: ${course.title}` : ''}`}
    >
      <span className="tp-course-name">{course.name}</span>
      <span className="print-only tp-course-title">{course.title}</span>
      {hover && <CourseHoverCard course={course} semesterIndex={semesterIndex} duplicate={duplicate} />}
    </div>
  );
}

function CourseChip({ course, semesterIndex, index, duplicate, onRemove }) {
  const [hover, setHover] = useState(false);
  return (
    <Draggable draggableId={`course-${semesterIndex}-${index}-${course.id}`} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`tp-course ${snapshot.isDragging ? 'dragging' : ''} ${
            isWrongSeason(course, semesterIndex) ? 'wrong-season' : ''
          }`}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onFocus={() => setHover(true)}
          onBlur={() => setHover(false)}
          aria-label={`${course.name}${course.title ? `: ${course.title}` : ''}`}
        >
          <span className="tp-course-name">{course.name}</span>
          <span className="print-only tp-course-title">{course.title}</span>
          <button
            type="button"
            className="tp-course-remove"
            aria-label={`Remove ${course.name}`}
            onClick={(e) => {
              e.stopPropagation();
              onRemove(semesterIndex, index);
            }}
          >
            <Icon name="x" size={15} />
          </button>
          {hover && !snapshot.isDragging && (
            <CourseHoverCard course={course} semesterIndex={semesterIndex} duplicate={duplicate} />
          )}
        </div>
      )}
    </Draggable>
  );
}

function ReadOnlySemester({ index, season, courses, duplicateNames }) {
  return (
    <div className="tp-semester" aria-label={`${season} semester`}>
      <span className="tp-season-label">{season}</span>
      <div className="tp-semester-body">
        {courses.map((course, i) => (
          <ReadOnlyCourseChip
            key={`${course.id}-${i}`}
            course={course}
            semesterIndex={index}
            duplicate={duplicateNames.has(course.name)}
          />
        ))}
        {courses.length === 0 && <p className="tp-semester-empty dont-print">No courses</p>}
      </div>
    </div>
  );
}

function Semester({ index, season, courses, draggingSeason, duplicateNames, onRemove }) {
  return (
    <Droppable droppableId={semesterDroppableId(index)}>
      {(provided, snapshot) => {
        let dropTone = '';
        if (snapshot.isDraggingOver) {
          const columnSeason = season.toLowerCase();
          dropTone =
            draggingSeason === 'fall' || draggingSeason === 'spring'
              ? draggingSeason === columnSeason
                ? 'drop-ok'
                : 'drop-warn'
              : 'drop-ok';
        }
        return (
          <div className={`tp-semester ${dropTone}`} aria-label={`${season} semester`}>
            <span className="tp-season-label">{season}</span>
            <div className="tp-semester-body" ref={provided.innerRef} {...provided.droppableProps}>
              {courses.map((course, i) => (
                <CourseChip
                  key={`${course.id}-${i}`}
                  course={course}
                  semesterIndex={index}
                  index={i}
                  duplicate={duplicateNames.has(course.name)}
                  onRemove={onRemove}
                />
              ))}
              {provided.placeholder}
              {courses.length === 0 && !snapshot.isDraggingOver && (
                <p className="tp-semester-empty dont-print">Drag courses here</p>
              )}
            </div>
          </div>
        );
      }}
    </Droppable>
  );
}

/**
 * The four-year grid. `readOnly` renders the compare-mode board: no drag-and-drop (so its ids never
 * collide with the editable board's droppables) and no #semesters id, which the tutorial targets.
 */
export default function Board({ schedule, classYear, draggingSeason, onRemove, readOnly = false, label }) {
  const counts = new Map();
  (schedule || []).slice(0, 8).flat().forEach((c) => counts.set(c.name, (counts.get(c.name) || 0) + 1));
  const duplicateNames = new Set([...counts].filter(([, n]) => n > 1).map(([name]) => name));

  return (
    <section
      id={readOnly ? undefined : 'semesters'}
      className={`tp-board ${readOnly ? 'readonly' : ''}`}
      aria-label={label || 'Four-year plan'}
    >
      {!classYear && !readOnly && (
        <p className="tp-board-warning dont-print">Set your class year in Settings to label semesters correctly.</p>
      )}
      <div className="tp-years">
        {YEARS.map((year, y) => (
          <div key={year} className="tp-year unbreakable">
            <h2 className="tp-year-title">{year}</h2>
            <div className="tp-year-semesters">
              {SEASONS.map((season, s) => {
                const index = y * 2 + s;
                if (readOnly) {
                  return (
                    <ReadOnlySemester
                      key={season}
                      index={index}
                      season={season}
                      courses={schedule?.[index] || []}
                      duplicateNames={duplicateNames}
                    />
                  );
                }
                return (
                  <Semester
                    key={season}
                    index={index}
                    season={season}
                    courses={schedule?.[index] || []}
                    draggingSeason={draggingSeason}
                    duplicateNames={duplicateNames}
                    onRemove={onRemove}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
