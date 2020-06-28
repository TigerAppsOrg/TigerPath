import React, { useState, useEffect } from 'react';
import Popover from 'react-tiny-popover';
import PopoverContent from './PopoverContent';
import styled from 'styled-components';

const PopoverHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const PopoverTitle = styled.div`
  font-weight: bold;
  margin-right: 0.5rem;
`;

const PopoverDescription = styled.div`
  margin-top: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
  overflow-wrap: break-word;
  white-space: pre-wrap;
`;

const Label = styled.span`
  display: flex;
  justify-content: space-between;
`;

const ReqName = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Progress = styled.span`
  padding-left: 0.5rem;
  padding-right: 0.5rem;
`;

const ReqCategoryLabel = (props) => {
  const { requirement, onChange } = props;
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
    onChange('searchQuery', searchQuery);
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
          <i className="fa fa-search"></i>
          <span>Find</span>
        </button>
      </PopoverHeader>
      {requirement.explanation && (
        <PopoverDescription>{requirement.explanation}</PopoverDescription>
      )}
    </PopoverContent>
  );

  return (
    <div
      onMouseEnter={() => setIsPopoverOpen(true)}
      onMouseLeave={() => setIsPopoverOpen(false)}
    >
      <Popover
        isOpen={isPopoverOpen}
        position="left"
        content={renderPopoverContent}
      >
        <Label>
          <ReqName>
            <span className="my-arrow" />
            <span>{requirement['name']}</span>
          </ReqName>
          <Progress>{progress}</Progress>
        </Label>
      </Popover>
    </div>
  );
};

export default ReqCategoryLabel;
