import React from 'react';
import { Draggable, Droppable } from 'react-beautiful-dnd';
import styled from 'styled-components';
import CourseCard from './CourseCard';

const PlaceholderCourse = styled(CourseCard)`
  & ~ [data-rbd-placeholder-context-id] {
    display: none !important;
  }
`;

const SearchCourseCard = (props) => {
  const { courseIndex, courseKey, course } = props;

  return (
    <Droppable
      droppableId={`search-result-droppable-${courseKey}`}
      isDropDisabled={true}
    >
      {(provided, snapshot) => (
        <div ref={provided.innerRef} {...provided.droppableProps}>
          <Draggable draggableId={courseKey} index={courseIndex}>
            {(provided, snapshot) => (
              <>
                <CourseCard
                  ref={provided.innerRef}
                  courseKey={courseKey}
                  course={course}
                  isDragging={snapshot.isDragging}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                />
                {snapshot.isDragging && (
                  <PlaceholderCourse
                    courseKey={`${courseKey}-placeholder`}
                    course={course}
                  />
                )}
              </>
            )}
          </Draggable>
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
};

export default SearchCourseCard;
