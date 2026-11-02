import React, { useEffect, useRef, useState } from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import Icon from './Icon';
import { searchCourses } from '../api';

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 50;
export const SEARCH_DROPPABLE_ID = 'search-results';
export const SATISFYING_PREFIX = 'Satisfying: ';

function offeredLabel(semesterList) {
  return (semesterList || [])
    .slice()
    .reverse()
    .map((code) => `${code[0] === 'f' ? 'Fall' : 'Spring'} 20${code.slice(1)}`)
    .join(', ');
}

export default function SearchPanel({
  query,
  onQueryChange,
  results,
  onResultsChange,
  loading: externalLoading,
  selectedCourseId,
  onSelectCourse,
  scheduledIds,
}) {
  const [loading, setLoading] = useState(false);
  const [hidePlanned, setHidePlanned] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const abortRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => () => {
    abortRef.current?.abort();
    clearTimeout(timerRef.current);
  }, []);

  const handleChange = (value) => {
    onQueryChange(value);
    abortRef.current?.abort();
    clearTimeout(timerRef.current);

    const trimmed = value.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setLoading(false);
      onResultsChange([]);
      return;
    }

    setLoading(true);
    timerRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;
      searchCourses(trimmed, controller.signal)
        .then((data) => {
          onResultsChange(data || []);
          setLoading(false);
        })
        .catch((error) => {
          if (error.name === 'AbortError') return;
          onResultsChange([]);
          setLoading(false);
        });
    }, DEBOUNCE_MS);
  };

  const isLoading = loading || externalLoading;
  const trimmed = query.trim();
  const isSatisfyingMode = query.startsWith(SATISFYING_PREFIX);
  const visible = hidePlanned ? results.filter((r) => !scheduledIds.has(r.id)) : results;

  let emptyMessage = null;
  if (isLoading) emptyMessage = 'Searching...';
  else if (!trimmed) emptyMessage = 'Start typing to search courses.';
  else if (!isSatisfyingMode && trimmed.length < MIN_QUERY_LENGTH)
    emptyMessage = `Type at least ${MIN_QUERY_LENGTH} characters to search.`;
  else if (visible.length === 0) emptyMessage = 'No courses found.';

  return (
    <aside id="search-pane" className="tp-search dont-print" aria-label="Course search">
      <div className="tp-search-box">
        <Icon name="search" size={19} className="tp-muted" />
        <input
          id="search-text"
          type="search"
          value={query}
          placeholder="Search..."
          autoComplete="off"
          aria-label="Search courses"
          onChange={(e) => handleChange(e.target.value)}
          autoFocus
        />
        <button
          type="button"
          className="tp-icon-btn"
          aria-label="Search filters"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((open) => !open)}
        >
          <Icon name="sliders" size={19} />
        </button>
        {filtersOpen && (
          <div className="tp-search-filters">
            <label>
              <input
                type="checkbox"
                checked={hidePlanned}
                onChange={(e) => setHidePlanned(e.target.checked)}
              />
              Hide courses already in this plan
            </label>
          </div>
        )}
      </div>

      <p className="tp-search-info" aria-live="polite">
        {visible.length} Search Results
        {isLoading && <Icon name="loader" size={14} className="tp-spin" />}
      </p>

      <Droppable droppableId={SEARCH_DROPPABLE_ID} isDropDisabled>
        {(provided) => (
          <div className="tp-search-results" ref={provided.innerRef} {...provided.droppableProps}>
            {emptyMessage && <p className="tp-empty">{emptyMessage}</p>}
            {!emptyMessage &&
              visible.map((course, index) => (
                <Draggable key={course.id} draggableId={`search-${course.id}`} index={index}>
                  {(dragProvided, snapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      {...dragProvided.dragHandleProps}
                      className={`tp-search-card ${
                        selectedCourseId === course.id ? 'selected' : ''
                      } ${snapshot.isDragging ? 'dragging' : ''}`}
                      onClick={() => onSelectCourse(selectedCourseId === course.id ? null : course)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onSelectCourse(selectedCourseId === course.id ? null : course);
                      }}
                      aria-label={`${course.name}: ${course.title}. Drag into a semester, or press Enter for details.`}
                    >
                      <div className="tp-search-card-code" title={course.name}>
                        {course.name}
                      </div>
                      <div className="tp-search-card-desc">
                        <strong>{course.title}</strong>
                        {course.semester_list?.length > 0 && (
                          <span>Previously offered: {offeredLabel(course.semester_list)}</span>
                        )}
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </aside>
  );
}
