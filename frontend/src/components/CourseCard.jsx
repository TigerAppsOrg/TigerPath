import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { EXTERNAL_CREDITS_SEMESTER_INDEX } from 'utils/SemesterUtils';

export default function CourseCard({
  course,
  courseKey,
  courseIndex,
  semIndex,
  onCourseRemove,
  onCourseSelect,
}) {
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

  const showCourseDetails = (event) => {
    event.stopPropagation();
    onCourseSelect?.(course);
  };

  const getClassNames = (isDragging) => {
    let classNames = ['course-card', course['semester']];
    if (isDragging) classNames.push('course-card-shadow');
    return classNames.join(' ');
  };

  const getDragStyle = (style, snapshot) => {
    if (!snapshot.isDropAnimating) return style;
    return {
      ...style,
      transitionDuration: '0.08s',
    };
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
            className={getClassNames(snapshot.isDragging)}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={getDragStyle(provided.draggableProps.style, snapshot)}
            aria-label={`${course['name']} in schedule`}
          >
            <div className="course-name">{course['name']}</div>
            {!course.external && (
              <button
                type="button"
                className="course-detail-course-btn"
                aria-label={`View details for ${course['name']}`}
                title={`View details for ${course['name']}`}
                onClick={showCourseDetails}
              >
                <i className="fas fa-info-circle" aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              className="delete-course"
              aria-label={`Remove ${course['name']}`}
              title={`Remove ${course['name']}`}
              onClick={removeCourse}
            >
              <i className="fas fa-times-circle" aria-hidden="true" />
            </button>
          </div>
        )}
      </Draggable>
      <div className="search-card-info print-only">{course['title']}</div>
    </div>
  );
}
