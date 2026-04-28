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

const SemesterColumn = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  padding: 0 0 0 2px;
`;

const SemLabelWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  flex-shrink: 0;
  min-width: 0;
`;

const SemLabelLine = styled.div`
  flex: 1;
  height: 2px;
  background: ${({ theme }) => theme.lightGrey};
  opacity: 0.8;
`;

const SemLabelText = styled.span`
  font-size: 17px;
  font-weight: 700;
  color: #111111;
  flex-shrink: 0;
`;

const SemesterBody = styled.div`
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
  padding: 0 10px 0 12px;
  border-radius: 4px;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;

  &:hover,
  &:focus-within {
    scrollbar-color: rgba(0, 0, 0, 0.24) transparent;
  }

  &::-webkit-scrollbar {
    width: 7px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 999px;
  }

  &:hover::-webkit-scrollbar-thumb,
  &:focus-within::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.24);
  }

  background-color: ${({ theme, $semesterBodyColor }) => {
    switch ($semesterBodyColor) {
      case SEMESTER_BODY_COLOR.GREEN:
        return `${theme.greenSemBody}`;
      case SEMESTER_BODY_COLOR.RED:
        return `${theme.redSemBody}`;
      default:
        return 'transparent';
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
    <SemesterColumn className={classNameStr}>
      <SemLabelWrapper>
        <SemLabelLine />
        <SemLabelText>{children}</SemLabelText>
        <SemLabelLine />
      </SemLabelWrapper>
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
    </SemesterColumn>
  );
}
