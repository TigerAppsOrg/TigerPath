import React, { useState, useEffect, useCallback } from 'react';
import SearchCard from 'components/SearchCard';
import useSWR from 'swr';
import styled from 'styled-components';
import useDebounce from '../hooks/use-debounce';

const Spinner = styled.i`
  font-size: inherit;
  margin-left: 2px;
`;

const getCoursesEndpoint = '/api/v1/get_courses/';

const Search = (props) => {
  const { searchResults, onChange } = props;
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 100);

  const fetcher = useCallback(
    async (url) => {
      if (url === getCoursesEndpoint || debouncedSearchQuery.length < 3) {
        return [];
      }
      const res = await fetch(url);
      const json = await res.json();
      return json;
    },
    [debouncedSearchQuery]
  );

  const { data: searchResultsData } = useSWR(
    `${getCoursesEndpoint}${debouncedSearchQuery}`,
    fetcher
  );

  useEffect(() => {
    if (!searchResultsData) return;
    onChange('searchResults', searchResultsData);
    setIsLoading(false);
  }, [searchResultsData]);

  const onSearchQueryChange = (event) => {
    setSearchQuery(event.target.value);
    setIsLoading(true);
  };

  return (
    <>
      <div id="search-courses">
        <input
          type="text"
          id="search-text"
          placeholder="Search Courses"
          value={searchQuery}
          onChange={onSearchQueryChange}
          className="form-control"
          autoFocus
        />
      </div>
      <div id="search-info">
        <div id="search-count">
          <span id="search-count-num">{searchResults.length}</span>
        </div>
        <span>Search Results</span>
        {isLoading && (
          <Spinner className="fas fa-circle-notch fa-spin"></Spinner>
        )}
      </div>
      <div id="display-courses">
        {searchResults.map((course, courseIndex) => {
          const courseKey = `course-card-${course['semester']}-search-${courseIndex}`;
          return (
            <SearchCard
              key={courseKey}
              courseKey={courseKey}
              index={courseIndex}
              course={course}
            />
          );
        })}
      </div>
    </>
  );
};

export default Search;
