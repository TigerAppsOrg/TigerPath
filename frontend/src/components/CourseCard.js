import React, { useState } from 'react';
import CoursePopover from './CoursePopover';
import { Draggable } from 'react-beautiful-dnd';
import { EXTERNAL_CREDITS_SEMESTER_INDEX } from 'utils/SemesterUtils';

const CourseCard = (props) => {
  const { semIndex, courseIndex, courseKey, course, onCourseRemove } = props;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const removeCourse = () => {
    onCourseRemove(semIndex, courseIndex);
  };

  const getClassNames = (isDragging) => {
    let classNames = [];
    classNames.push('course-card');
    classNames.push(course['semester']);
    if (isDragging) classNames.push('course-card-shadow');
    return classNames.join(' ');
  };

  return (
    <div
      className="unbreakable"
      onMouseEnter={() => setIsPopoverOpen(true)}
      onMouseLeave={() => setIsPopoverOpen(false)}
    >
      <CoursePopover
        isOpen={isPopoverOpen}
        course={course}
        courseKey={courseKey}
        semIndex={semIndex}
      >
        <div>
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
        </div>
      </CoursePopover>
      <div className="search-card-info print-only">{course['title']}</div>
    </div>
  );
};

export default CourseCard;
