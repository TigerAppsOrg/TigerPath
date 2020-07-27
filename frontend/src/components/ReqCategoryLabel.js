import React, { useState, useEffect } from 'react';
import Popover from 'react-tiny-popover';
import PopoverContent from './PopoverContent';
import styled from 'styled-components';
import {
  TreeLabel,
  TreeNameContainer,
  TreeName,
  PopoverDescription,
} from '../styles/ReqTree';

const Progress = styled.span`
  padding-left: 0.5rem;
  padding-right: 0.5rem;
`;

const PopoverHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const PopoverTitle = styled.div`
  font-weight: bold;
  margin-right: 0.5rem;
`;

const SearchIcon = styled.i`
  margin-right: 5px;
`;

const ReqCategoryLabel = (props) => {
  const { requirement, setSearchQuery, onClick } = props;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    if (requirement['min_needed'] === 0) {
      setProgress(requirement['count']);
    } else {
      setProgress(requirement['count'] + '/' + requirement['min_needed']);
    }
  }, [requirement]);

  const getReqCourses = () => {
    const searchQuery = 'Category: ' + requirement['path_to'];
    setSearchQuery(searchQuery);
  };

  const renderPopoverContent = () => (
    <PopoverContent>
      <PopoverHeader>
        <PopoverTitle>{requirement['name']}</PopoverTitle>
        <button
          type="button"
          className="btn btn-light btn-sm"
          onClick={getReqCourses}
        >
          <SearchIcon className="fa fa-search"></SearchIcon>
          <span>Find</span>
        </button>
      </PopoverHeader>
      {requirement.explanation && (
        <PopoverDescription>{requirement.explanation}</PopoverDescription>
      )}
    </PopoverContent>
  );

  return (
    <TreeLabel
      onMouseEnter={() => setIsPopoverOpen(true)}
      onMouseLeave={() => setIsPopoverOpen(false)}
    >
      <Popover
        isOpen={isPopoverOpen}
        position="left"
        content={renderPopoverContent}
      >
        <TreeNameContainer onClick={onClick}>
          <TreeName>{requirement['name']}</TreeName>
          <Progress>{progress}</Progress>
        </TreeNameContainer>
      </Popover>
    </TreeLabel>
  );
};

export default ReqCategoryLabel;
