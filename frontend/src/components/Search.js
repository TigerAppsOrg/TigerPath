import React, { useState, useEffect, useMemo, useRef } from 'react';
import SearchCard from 'components/SearchCard';
import useSWR from 'swr';
import styled from 'styled-components';
import useDebounce from '../hooks/use-debounce';
import Loader from './Loader';

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
  const searchResultsRef = useRef(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 100);

  const fetchUrl = useMemo(() => {
    if (debouncedSearchQuery.startsWith('Category: ')) {
      let query = debouncedSearchQuery.split('Category: ')[1];
      query = query.replace(/\/\//g, '$');
      return GET_REQ_COURSES_URL + encodeURIComponent(query);
    } else if (debouncedSearchQuery.length > 0) {
      return GET_COURSES_URL + encodeURIComponent(debouncedSearchQuery);
    } else {
      return null;
    }
  }, [debouncedSearchQuery]);
  const { data: searchResultsData } = useSWR(fetchUrl);

  useEffect(() => {
    if (!debouncedSearchQuery) return;
    if (fetchUrl) setIsLoading(true);
  }, [debouncedSearchQuery, fetchUrl]);

  useEffect(() => {
    if (!searchResultsData) return;
    setSearchResults(searchResultsData);
    searchResultsRef.current.scrollTo(0, 0);
    setIsLoading(false);
  }, [searchResultsData, setSearchResults]);

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
        {isLoading && <Loader className="ml-2" size={10} />}
      </SearchInfo>
      <SearchResults ref={searchResultsRef}>
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
