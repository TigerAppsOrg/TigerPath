import React, { useEffect, useRef, useState } from 'react';
import SearchCard from 'components/SearchCard';

const SEARCH_DEBOUNCE_MS = 50;
const MIN_QUERY_LENGTH = 3;

export default function Search({ onChange, searchQuery, searchResults }) {
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const updateSearch = (event) => {
    const rawQuery = event.target.value;
    const trimmedQuery = rawQuery.trim();
    onChange('searchQuery', rawQuery);

    // Cancel pending network and delayed search work.
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (trimmedQuery === '') {
      onChange('searchResults', []);
      setLoading(false);
      return;
    }

    if (trimmedQuery.length < MIN_QUERY_LENGTH) {
      onChange('searchResults', []);
      setLoading(false);
      return;
    }

    setLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    searchTimeoutRef.current = setTimeout(() => {
      fetch('/api/v1/get_courses/' + encodeURIComponent(trimmedQuery), {
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
    }, SEARCH_DEBOUNCE_MS);
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

    if (searchQuery.trim().length < MIN_QUERY_LENGTH) {
      return (
        <p className="text-muted p-2 mb-0">
          Type at least {MIN_QUERY_LENGTH} characters to search.
        </p>
      );
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
