import React, { useState } from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import SearchCourseCard from './SearchCourseCard';

const SEMESTER_OPTIONS = [
  { label: 'Fresh Fall', value: 0 },
  { label: 'Fresh Spring', value: 1 },
  { label: 'Soph Fall', value: 2 },
  { label: 'Soph Spring', value: 3 },
  { label: 'Jr Fall', value: 4 },
  { label: 'Jr Spring', value: 5 },
  { label: 'Sr Fall', value: 6 },
  { label: 'Sr Spring', value: 7 },
];

export default function SearchCard({
  course,
  courseKey,
  index: courseIndex,
  onSelect,
  isSelected,
  onAddCourse,
}) {
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState(0);

  const handleSelect = () => {
    if (onSelect) onSelect(course);
  };

  const toggleAddMenu = (event) => {
    event.stopPropagation();
    setIsAddMenuOpen((isOpen) => !isOpen);
  };

  const handleAddCourse = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!onAddCourse) return;
    const added = onAddCourse(course, selectedSemester);
    if (added) setIsAddMenuOpen(false);
  };

  return (
    <Droppable
      droppableId={`search-result-droppable-${courseKey}`}
      isDropDisabled={true}
    >
      {(droppableProvided) => (
        <div ref={droppableProvided.innerRef} {...droppableProvided.droppableProps}>
          <Draggable
            draggableId={courseKey}
            index={courseIndex}
            disableInteractiveElementBlocking
          >
            {(draggableProvided, snapshot) => (
              <div
                ref={draggableProvided.innerRef}
                className={`search-card ${course['semester']}${isSelected ? ' selected' : ''}${snapshot.isDragging ? ' dragging' : ''}`}
                style={{
                  cursor: snapshot.isDragging ? 'grabbing' : 'grab',
                  ...draggableProvided.draggableProps.style,
                }}
                {...draggableProvided.draggableProps}
              >
                <button
                  type="button"
                  className="search-card-main"
                  aria-pressed={isSelected}
                  aria-label={`View details for ${course['name']}: ${course['title']}`}
                  onClick={handleSelect}
                  {...draggableProvided.dragHandleProps}
                >
                  <SearchCourseCard course={course} />
                  <span className="course-title">{course['title']}</span>
                </button>
                {onAddCourse && (
                  <button
                    type="button"
                    className="search-card-add-btn"
                    aria-expanded={isAddMenuOpen}
                    aria-controls={`${courseKey}-add-menu`}
                    onClick={toggleAddMenu}
                  >
                    <i className="fas fa-plus" aria-hidden="true" />
                    <span>Add</span>
                  </button>
                )}
                {onAddCourse && isAddMenuOpen && (
                  <form
                    id={`${courseKey}-add-menu`}
                    className="search-card-add-menu"
                    aria-label={`Add ${course.name} to a semester`}
                    onClick={(event) => event.stopPropagation()}
                    onSubmit={handleAddCourse}
                  >
                    <label className="visually-hidden" htmlFor={`${courseKey}-semester`}>
                      Destination semester
                    </label>
                    <select
                      id={`${courseKey}-semester`}
                      value={selectedSemester}
                      onChange={(event) => setSelectedSemester(Number(event.target.value))}
                    >
                      {SEMESTER_OPTIONS.map((semester) => (
                        <option key={semester.value} value={semester.value}>
                          {semester.label}
                        </option>
                      ))}
                    </select>
                    <button type="submit">
                      Add to Plan
                    </button>
                  </form>
                )}
                {!onAddCourse && (
                  <button
                    type="button"
                    className="search-card-info-btn"
                    title="View course details"
                    aria-label={`View details for ${course['name']}`}
                    onClick={(e) => { e.stopPropagation(); handleSelect(); }}
                  >
                    <i className="fas fa-info-circle fa-lg fa-fw course-info" />
                  </button>
                )}
              </div>
            )}
          </Draggable>
          <div style={{ display: 'none' }}>{droppableProvided.placeholder}</div>
        </div>
      )}
    </Droppable>
  );
}
