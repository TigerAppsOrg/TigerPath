import React, { useState, useEffect, useMemo } from 'react';
import SearchCard from 'components/SearchCard';
import useSWR from 'swr';
import styled from 'styled-components';
import useDebounce from '../hooks/use-debounce';

const SearchInfo = styled.div`
  margin: 0.25rem 0.75rem;
  color: ${({ theme }) => theme.lightGrey};
`;

const SearchResults = styled.div`
  height: calc(100vh - 126px);
  overflow: auto;
`;

const GET_COURSES_URL = '/api/v1/get_courses/';
const GET_REQ_COURSES_URL = '/api/v1/get_req_courses/';

const Search = (props) => {
  const {
    searchQuery,
    searchResults,
    setSearchQuery,
    setSearchResults,
  } = props;
  const [isLoading, setIsLoading] = useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 100);

  const fetchUrl = useMemo(() => {
    if (debouncedSearchQuery.startsWith('Category: ')) {
      let query = debouncedSearchQuery.split('Category: ')[1];
      query = query.replace(/\/\//g, '$');
      return GET_REQ_COURSES_URL + encodeURIComponent(query);
    } else if (debouncedSearchQuery.length >= 3) {
      return GET_COURSES_URL + encodeURIComponent(debouncedSearchQuery);
    } else {
      return null;
    }
  }, [debouncedSearchQuery]);
  const { data: searchResultsData } = useSWR(fetchUrl);

  useEffect(() => {
    if (!searchResultsData) return;
    setSearchResults(searchResultsData);
    setIsLoading(false);
  }, [searchResultsData]);

  useEffect(() => {
    if (!searchQuery) return;
    setIsLoading(true);
  }, [searchQuery]);

  const onSearchQueryChange = (event) => setSearchQuery(event.target.value);

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
      <SearchInfo>
        <span>{searchResults.length} Search Results</span>
        {isLoading && <i className="ml-2 fas fa-circle-notch fa-spin"></i>}
      </SearchInfo>
      <SearchResults>
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
      </SearchResults>
    </>
  );
};

export default Search;
