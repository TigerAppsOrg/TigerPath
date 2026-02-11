import React, { useMemo, useCallback } from 'react';
import CourseCard from 'components/CourseCard';
import { Droppable } from '@hello-pangea/dnd';
import styled from 'styled-components';
import {
  SEMESTER_TYPE,
  EXTERNAL_CREDITS_SEMESTER_INDEX,
  getSemesterType,
  isFallSemester,
  isSpringSemester,
} from 'utils/SemesterUtils';

const SEMESTER_BODY_COLOR = Object.freeze({
  GREY: Symbol('greySemBody'),
  GREEN: Symbol('greenSemBody'),
  RED: Symbol('redSemBody'),
});

const SemesterHeader = styled.div`
  color: #ffffff;
  text-align: center;
  font-size: large;
  border-radius: 2px 2px 0 0;
  padding: 2px;

  background-color: ${({ theme, $semesterType }) => {
    switch ($semesterType) {
      case SEMESTER_TYPE.FALL_SEM:
        return `${theme.fallSemHeaderColor}`;
      case SEMESTER_TYPE.SPRING_SEM:
        return `${theme.springSemHeaderColor}`;
      default:
        return `${theme.ECHeaderColor}`;
    }
  }};
`;

const SemesterBody = styled.div`
  list-style-type: none;
  padding: 5px;
  height: calc(100% - 31px);
  min-height: 200px;
  border-radius: 0 0 2px 2px;

  background-color: ${({ theme, $semesterBodyColor }) => {
    switch ($semesterBodyColor) {
      case SEMESTER_BODY_COLOR.GREEN:
        return `${theme.greenSemBody}`;
      case SEMESTER_BODY_COLOR.RED:
        return `${theme.redSemBody}`;
      default:
        return `${theme.greySemBody}`;
    }
  }};
`;

export default function Semester({ onChange, schedule, semesterIndex, className, children }) {
  const semesterType = useMemo(
    () => getSemesterType(semesterIndex),
    [semesterIndex]
  );

  const removeCourse = useCallback(
    (semIndex, courseIndex) => {
      let newSchedule = schedule.slice();
      newSchedule[semIndex].splice(courseIndex, 1);
      onChange('schedule', newSchedule);
    },
    [schedule, onChange]
  );

  const courseCardList = (semester, semIndex) => {
    return (
      <>
        {semester[semIndex].map((course, courseIndex) => {
          let courseKey = `course-card-${course['semester']}-${semIndex}-${courseIndex}`;
          return (
            <CourseCard
              key={courseKey}
              course={course}
              courseKey={courseKey}
              onCourseRemove={removeCourse}
              semIndex={semIndex}
              courseIndex={courseIndex}
            />
          );
        })}
      </>
    );
  };

  const getSemesterBodyColor = (snapshot) => {
    if (snapshot.isDraggingOver) {
      let courseKey = snapshot.draggingOverWith;
      let courseSemType = courseKey.split('-')[2];

      if (
        (courseSemType === 'fall' && isFallSemester(semesterType)) ||
        (courseSemType === 'spring' && isSpringSemester(semesterType)) ||
        courseSemType === 'both' ||
        courseSemType === 'external'
      ) {
        return SEMESTER_BODY_COLOR.GREEN;
      } else {
        return SEMESTER_BODY_COLOR.RED;
      }
    }

    return SEMESTER_BODY_COLOR.GREY;
  };

  let semId = `sem${semesterIndex}`;
  let classNameStr = 'semester';
  if (className) classNameStr += ` ${className}`;

  return (
    <div className={classNameStr}>
      <SemesterHeader $semesterType={semesterType}>
        {children}
      </SemesterHeader>
      <Droppable
        key={semId}
        droppableId={semId}
        isDropDisabled={semesterIndex === EXTERNAL_CREDITS_SEMESTER_INDEX}
      >
        {(provided, snapshot) => (
          <SemesterBody
            ref={provided.innerRef}
            {...provided.droppableProps}
            $semesterBodyColor={getSemesterBodyColor(snapshot)}
          >
            {schedule && courseCardList(schedule, semesterIndex)}
            {provided.placeholder}
          </SemesterBody>
        )}
      </Droppable>
    </div>
  );
}
