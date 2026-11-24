import React, { useMemo } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import CompareSummary from './CompareSummary';
import { CourseChip, ReadOnlyCourseChip, dropToneFor, duplicateNamesIn, semesterDroppableId } from './Board';
import { SEASONS, YEARS } from '../helpers/schedule';
import { courseKey, diffSchedules } from '../helpers/compare';

const semesterName = (index) => `${YEARS[Math.floor(index / 2)]} ${SEASONS[index % 2]}`;

function withTitle(mark, otherPlanName) {
  if (!mark || mark.status !== 'moved') return mark;
  return { ...mark, title: `${semesterName(mark.otherIndex)} in ${otherPlanName}` };
}

/** One semester of the editable (active) plan, as a single horizontal line of chips. */
function EditableRow({ index, season, courses, draggingSeason, duplicateNames, marks, otherName, onRemove }) {
  return (
    <Droppable droppableId={semesterDroppableId(index)} direction="horizontal">
      {(provided, snapshot) => (
        <div
          className={`tp-byyear-row active-col ${dropToneFor(season, draggingSeason, snapshot.isDraggingOver)}`}
          ref={provided.innerRef}
          {...provided.droppableProps}
          aria-label={`${semesterName(index)}, editable plan`}
        >
          {courses.map((course, i) => (
            <CourseChip
              key={`${course.id}-${i}`}
              course={course}
              semesterIndex={index}
              index={i}
              duplicate={duplicateNames.has(course.name)}
              onRemove={onRemove}
              diff={withTitle(marks.get(courseKey(course)), otherName)}
            />
          ))}
          {provided.placeholder}
          {courses.length === 0 && !snapshot.isDraggingOver && <span className="tp-byyear-empty">—</span>}
        </div>
      )}
    </Droppable>
  );
}

function ReadOnlyRow({ index, courses, duplicateNames, marks, otherName }) {
  return (
    <div className="tp-byyear-row compare-col" aria-label={`${semesterName(index)}, compared plan`}>
      {courses.map((course, i) => (
        <ReadOnlyCourseChip
          key={`${course.id}-${i}`}
          course={course}
          semesterIndex={index}
          duplicate={duplicateNames.has(course.name)}
          diff={withTitle(marks.get(courseKey(course)), otherName)}
        />
      ))}
      {courses.length === 0 && <span className="tp-byyear-empty">—</span>}
    </div>
  );
}

/**
 * TIG-337 "By year" compare: one row per semester, each plan's courses on a single line, the two plans
 * side by side so every semester lines up across. Courses not in the other plan are tagged "only here";
 * courses in a different semester there are tagged "moved". The active plan (left) stays editable.
 */
export default function CompareByYear({
  activePlan,
  comparePlan,
  schedule,
  compareSchedule,
  requirements,
  compareRequirements,
  draggingSeason,
  onRemove,
}) {
  const diff = useMemo(() => diffSchedules(schedule, compareSchedule), [schedule, compareSchedule]);
  const leftDupes = useMemo(() => duplicateNamesIn(schedule), [schedule]);
  const rightDupes = useMemo(() => duplicateNamesIn(compareSchedule), [compareSchedule]);
  const activeName = activePlan?.name || 'Active plan';
  const counts = {
    leftOnly: [...diff.left.values()].filter((m) => m.status === 'only').length,
    rightOnly: [...diff.right.values()].filter((m) => m.status === 'only').length,
    moved: [...diff.left.values()].filter((m) => m.status === 'moved').length,
  };

  return (
    <div className="tp-byyear">
      <p className="tp-byyear-legend">
        <strong>{counts.leftOnly}</strong> only in {activeName} · <strong>{counts.rightOnly}</strong> only in{' '}
        {comparePlan.name} · <strong>{counts.moved}</strong> in a different semester
        <span className="tp-byyear-key">
          <span className="tp-byyear-swatch diff-only" aria-hidden /> only in this plan
        </span>
        <span className="tp-byyear-key">
          <span className="tp-byyear-swatch diff-moved" aria-hidden /> other semester there (hover a course for where)
        </span>
      </p>
      <div className="tp-byyear-grid">
        <div className="tp-byyear-corner" aria-hidden />
        <header className="tp-byyear-head active-col">
          <div className="tp-compare-head">
            <h2>{activeName}</h2>
            <span className="tp-compare-tag editable">Editing</span>
          </div>
          <CompareSummary requirements={requirements} />
        </header>
        <header className="tp-byyear-head compare-col">
          <div className="tp-compare-head">
            <h2>{comparePlan.name}</h2>
            <span className="tp-compare-tag">Read-only</span>
          </div>
          <CompareSummary requirements={compareRequirements} />
        </header>

        {YEARS.map((year, y) => (
          <React.Fragment key={year}>
            <h3 className="tp-byyear-year">{year}</h3>
            {SEASONS.map((season, s) => {
              const index = y * 2 + s;
              return (
                <React.Fragment key={season}>
                  <div className="tp-byyear-season">{season}</div>
                  <EditableRow
                    index={index}
                    season={season}
                    courses={schedule?.[index] || []}
                    draggingSeason={draggingSeason}
                    duplicateNames={leftDupes}
                    marks={diff.left}
                    otherName={comparePlan.name}
                    onRemove={onRemove}
                  />
                  {compareSchedule ? (
                    <ReadOnlyRow
                      index={index}
                      courses={compareSchedule[index] || []}
                      duplicateNames={rightDupes}
                      marks={diff.right}
                      otherName={activeName}
                    />
                  ) : (
                    <div className="tp-byyear-row compare-col">
                      <span className="tp-byyear-empty">Loading…</span>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
