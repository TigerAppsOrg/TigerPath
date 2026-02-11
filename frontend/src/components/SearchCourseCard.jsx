import React from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import styled, { css } from 'styled-components';

const SearchCourseCardStyled = styled.div`
  ${({ isBeingDragged }) =>
    isBeingDragged &&
    css`
      cursor: grabbing !important;
      box-shadow: 0 14px 28px rgba(0, 0, 0, 0.25),
        0 10px 10px rgba(0, 0, 0, 0.22);
      z-index: 1;
    `}
`;

const PlaceholderCourse = styled.div`
  & ~ [data-rbd-placeholder-context-id] {
    display: none !important;
  }
`;

export default function SearchCourseCard({ courseIndex, courseKey, course }) {
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
                <SearchCourseCardStyled
                  ref={provided.innerRef}
                  id={courseKey}
                  title={course['name']}
                  className={`course-card ${course['semester']}`}
                  isBeingDragged={snapshot.isDragging}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                >
                  <div className="course-name">{course['name']}</div>
                </SearchCourseCardStyled>
                {snapshot.isDragging && (
                  <PlaceholderCourse
                    id={`${courseKey}-placeholder`}
                    className={`course-card ${course['semester']}`}
                  >
                    <div className="course-name">{course['name']}</div>
                  </PlaceholderCourse>
                )}
              </>
            )}
          </Draggable>
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}
