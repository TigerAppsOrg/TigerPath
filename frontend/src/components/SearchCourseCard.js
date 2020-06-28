import React from 'react';
import { Draggable, Droppable } from 'react-beautiful-dnd';
import styled from 'styled-components';
import CourseCard from './CourseCard';

const SearchCourseCardStyled = styled(CourseCard)`
  margin-top: 0.5rem;
`;

const PlaceholderCourse = styled(CourseCard)`
  margin-top: 0.5rem;

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
      {(droppableProvided) => (
        <div
          ref={droppableProvided.innerRef}
          {...droppableProvided.droppableProps}
        >
          <Draggable draggableId={courseKey} index={courseIndex}>
            {(draggableProvided, draggableSnapshot) => (
              <>
                <SearchCourseCardStyled
                  ref={draggableProvided.innerRef}
                  courseKey={courseKey}
                  course={course}
                  isDragging={draggableSnapshot.isDragging}
                  {...draggableProvided.draggableProps}
                  {...draggableProvided.dragHandleProps}
                />
                {draggableSnapshot.isDragging && (
                  <PlaceholderCourse
                    courseKey={`${courseKey}-placeholder`}
                    course={course}
                  />
                )}
              </>
            )}
          </Draggable>
          {droppableProvided.placeholder}
        </div>
      )}
    </Droppable>
  );
};

export default SearchCourseCard;
