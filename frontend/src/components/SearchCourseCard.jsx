import React from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import styled, { css } from 'styled-components';

const SearchCourseCardStyled = styled.div`
  ${({ $isBeingDragged }) =>
    $isBeingDragged &&
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

export default function SearchCourseCard({ courseIndex, courseKey, course, qualityRating, ratingColor }) {
  const bannerRight = (
    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
      {qualityRating != null && (
        <span
          style={{
            background: ratingColor,
            color: 'white',
            borderRadius: '3px',
            padding: '2px 6px',
            fontSize: '13px',
            fontWeight: 'bold',
            lineHeight: '1.5',
          }}
        >
          {qualityRating.toFixed(2)}
        </span>
      )}
    </div>
  );

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
                  $isBeingDragged={snapshot.isDragging}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  style={{ display: 'flex', alignItems: 'center', ...provided.draggableProps.style }}
                >
                  <div
                    className="course-name"
                    style={{ flex: 1, minWidth: 0, float: 'none', maxWidth: 'none' }}
                  >
                    {course['name']}
                  </div>
                  {bannerRight}
                </SearchCourseCardStyled>
                {snapshot.isDragging && (
                  <PlaceholderCourse
                    id={`${courseKey}-placeholder`}
                    className={`course-card ${course['semester']}`}
                    style={{ display: 'flex', alignItems: 'center' }}
                  >
                    <div
                      className="course-name"
                      style={{ flex: 1, minWidth: 0, float: 'none', maxWidth: 'none' }}
                    >
                      {course['name']}
                    </div>
                    {bannerRight}
                  </PlaceholderCourse>
                )}
              </>
            )}
          </Draggable>
          <div style={{ display: 'none' }}>{provided.placeholder}</div>
        </div>
      )}
    </Droppable>
  );
}
