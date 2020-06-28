import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import PopoverContent from './PopoverContent';
import Popover from 'react-tiny-popover';

const Label = styled.span`
  flex: 1;
  user-select: none;
`;

const PopoverTitle = styled.div`
  font-weight: bold;
`;

const PopoverDescription = styled.div`
  margin-top: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
`;

const PopoverContainer = styled.div`
  margin-top: 0.5rem;
`;

const SourceLink = styled.a`
  font-family: 'Lucida Console', Monaco, monospace;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
`;

const ReqDegreeLabel = (props) => {
  const { requirement, onClick } = props;
  const [name, setName] = useState(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  useEffect(() => {
    if (typeof requirement === 'object') {
      setName(requirement.name);
    } else {
      setName(requirement);
    }
  }, [requirement]);

  const renderPopoverContent = () => {
    if (typeof requirement === 'object') {
      return (
        <PopoverContent>
          <PopoverTitle>{name}</PopoverTitle>
          <PopoverDescription>
            <div>
              {requirement.explanation
                ? requirement.explanation
                : requirement.description}
            </div>
            {requirement.contacts && (
              <PopoverContainer>
                <PopoverTitle>Contacts:</PopoverTitle>
                <ul>
                  {requirement.contacts.map((contact) => (
                    <li key={contact.name}>
                      {contact.type}:{' '}
                      <a
                        href={`mailto:${contact.email}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {contact.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </PopoverContainer>
            )}
            {requirement.urls && (
              <PopoverContainer>
                <PopoverTitle>Sources:</PopoverTitle>
                <ul>
                  {requirement.urls.map((url) => (
                    <li key={url}>
                      <SourceLink
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {url}
                      </SourceLink>
                    </li>
                  ))}
                </ul>
              </PopoverContainer>
            )}
          </PopoverDescription>
        </PopoverContent>
      );
    } else {
      return <div>The {name} major is not supported yet.</div>;
    }
  };

  return (
    <Label
      onClick={onClick}
      onMouseEnter={() => setIsPopoverOpen(true)}
      onMouseLeave={() => setIsPopoverOpen(false)}
    >
      <Popover
        isOpen={isPopoverOpen}
        position="left"
        content={renderPopoverContent}
      >
        <span>{name}</span>
      </Popover>
    </Label>
  );
};

export default ReqDegreeLabel;
