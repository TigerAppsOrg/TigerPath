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

/**
 * By-year compare marker. The chip's outline (solid = only in this plan, dashed = other semester there)
 * shows the difference; this text says it for screen readers, and the chip's title for hover.
 */
function DiffTag({ diff }) {
  if (!diff || diff.status === 'same') return null;
  return <span className="tp-sr-only">{diff.status === 'only' ? ' (only in this plan)' : ` (${diff.title})`}</span>;
}

const diffTitle = (diff) => {
  if (!diff || diff.status === 'same') return undefined;
  return diff.status === 'only' ? 'Only in this plan' : `Moved: ${diff.title}`;
};

const diffClass = (diff) => (diff && diff.status !== 'same' ? `diff-${diff.status}` : '');

/** Compare mode's right-hand board: same look, no drag-and-drop and no remove button. */
export function ReadOnlyCourseChip({ course, semesterIndex, duplicate, diff }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      className={`tp-course readonly ${isWrongSeason(course, semesterIndex) ? 'wrong-season' : ''} ${diffClass(diff)}`}
      title={diffTitle(diff)}
      tabIndex={0}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      aria-label={`${course.name}${course.title ? `: ${course.title}` : ''}`}
    >
      <span className="tp-course-name">{course.name}</span>
      <DiffTag diff={diff} />
      <span className="print-only tp-course-title">{course.title}</span>
      {hover && <CourseHoverCard course={course} semesterIndex={semesterIndex} duplicate={duplicate} />}
    </div>
  );
}

export function CourseChip({ course, semesterIndex, index, duplicate, onRemove, diff }) {
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
          } ${diffClass(diff)}`}
          title={diffTitle(diff)}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onFocus={() => setHover(true)}
          onBlur={() => setHover(false)}
          aria-label={`${course.name}${course.title ? `: ${course.title}` : ''}`}
        >
          <span className="tp-course-name">{course.name}</span>
          <DiffTag diff={diff} />
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

/** Highlight for the semester under a drag: green if the course is offered that term, red if not. */
export function dropToneFor(season, draggingSeason, isDraggingOver) {
  if (!isDraggingOver) return '';
  if (draggingSeason !== 'fall' && draggingSeason !== 'spring') return 'drop-ok';
  return draggingSeason === season.toLowerCase() ? 'drop-ok' : 'drop-warn';
}

/** Course names that appear more than once in the first eight semesters. */
export function duplicateNamesIn(schedule) {
  const counts = new Map();
  (schedule || []).slice(0, 8).flat().forEach((c) => counts.set(c.name, (counts.get(c.name) || 0) + 1));
  return new Set([...counts].filter(([, n]) => n > 1).map(([name]) => name));
}

function Semester({ index, season, courses, draggingSeason, duplicateNames, onRemove }) {
  return (
    <Droppable droppableId={semesterDroppableId(index)}>
      {(provided, snapshot) => {
        const dropTone = dropToneFor(season, draggingSeason, snapshot.isDraggingOver);
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
  const duplicateNames = duplicateNamesIn(schedule);

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
