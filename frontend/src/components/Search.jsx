import React, { useState, useRef } from 'react';
import SearchCard from 'components/SearchCard';

export default function Search({ onChange, searchQuery, searchResults }) {
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef(null);

  const updateSearch = (event) => {
    setLoading(true);

    let query = event.target.value;
    onChange('searchQuery', query);
    if (query === '') query = '$';

    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    fetch('/api/v1/get_courses/' + query, {
      credentials: 'same-origin',
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((results) => {
        onChange('searchResults', results);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setLoading(false);
        }
      });
  };

  const renderSearchResults = () => {
    if (searchResults.length > 0) {
      return searchResults.map((course, courseIndex) => {
        const courseKey = `course-card-${course['semester']}-search-${courseIndex}`;
        return (
          <SearchCard
            key={courseKey}
            courseKey={courseKey}
            index={courseIndex}
            course={course}
          />
        );
      });
    }

    if (loading) {
      return <p className="text-muted p-2 mb-0">Searching...</p>;
    }

    if (searchQuery.trim() === '') {
      return <p className="text-muted p-2 mb-0">Start typing to search courses.</p>;
    }

    return <p className="text-muted p-2 mb-0">No courses found.</p>;
  };

  return (
    <>
      <div id="search-courses">
        <input
          type="text"
          id="search-text"
          placeholder="Search Courses"
          value={searchQuery}
          onChange={updateSearch}
          className="form-control"
          autoFocus
        />
      </div>
      <div id="search-info">
        <div id="search-count">
          <span id="search-count-num">{searchResults.length}</span>
        </div>
        <span>Search Results</span>
        {loading && (
          <i id="spinner" className="fas fa-circle-notch fa-spin" style={{ display: 'inline-block' }}></i>
        )}
      </div>
      <div id="display-courses">
        {renderSearchResults()}
      </div>
    </>
  );
}
