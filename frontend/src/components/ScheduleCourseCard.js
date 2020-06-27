import React, { useState } from 'react';
import CoursePopover from './CoursePopover';
import { Draggable } from 'react-beautiful-dnd';
import { EXTERNAL_CREDITS_SEMESTER_INDEX } from 'utils/SemesterUtils';
import CourseCard from './CourseCard';

const ScheduleCourseCard = (props) => {
  const {
    courseKey,
    course,
    semIndex,
    courseIndex,
    onCourseRemove,
    disablePopover,
  } = props;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const removeCourse = () => onCourseRemove(semIndex, courseIndex);

  return (
    <div
      className="unbreakable"
      onMouseEnter={() => setIsPopoverOpen(true)}
      onMouseLeave={() => setIsPopoverOpen(false)}
    >
      <CoursePopover
        isOpen={isPopoverOpen && !disablePopover}
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
              <CourseCard
                ref={provided.innerRef}
                courseKey={courseKey}
                course={course}
                isDragging={snapshot.isDragging}
                onCourseRemove={removeCourse}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
              />
            )}
          </Draggable>
        </div>
      </CoursePopover>
      <div className="mb-2 print-only">{course['title']}</div>
    </div>
  );
};

export default ScheduleCourseCard;
