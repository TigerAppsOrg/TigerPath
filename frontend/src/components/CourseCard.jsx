import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { EXTERNAL_CREDITS_SEMESTER_INDEX } from 'utils/SemesterUtils';

export default function CourseCard({ course, courseKey, courseIndex, semIndex, onCourseRemove }) {
  const removeCourse = () => {
    onCourseRemove(semIndex, courseIndex);
    // Hide Bootstrap 5 popover if active
    const el = document.getElementById(courseKey);
    if (el) {
      const Popover = window.bootstrap?.Popover;
      const instance = Popover?.getInstance(el);
      if (instance) instance.hide();
    }
  };

  const getClassNames = (isDragging) => {
    let classNames = ['course-card', course['semester']];
    if (isDragging) classNames.push('course-card-shadow');
    return classNames.join(' ');
  };

  return (
    <div className="unbreakable">
      <Draggable
        draggableId={courseKey}
        index={courseIndex}
        isDragDisabled={semIndex === EXTERNAL_CREDITS_SEMESTER_INDEX}
      >
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            id={courseKey}
            title={course['name']}
            className={getClassNames(snapshot.isDragging)}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
          >
            <div className="course-name">{course['name']}</div>
            <i
              className="fas fa-times-circle delete-course"
              onClick={removeCourse}
            />
          </div>
        )}
      </Draggable>
      <div className="search-card-info print-only">{course['title']}</div>
    </div>
  );
}
