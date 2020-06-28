import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import PopoverContent from './PopoverContent';
import Popover from 'react-tiny-popover';

const Title = styled.div`
  font-weight: bold;
`;

const PopoverDescription = styled.div`
  margin-top: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
`;

const Container = styled.div`
  margin-top: 0.5rem;
`;

const RefLink = styled.a`
  font-family: 'Lucida Console', Monaco, monospace;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
`;

const ReqDegreeLabel = (props) => {
  const { requirement } = props;
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
          <Title>{name}</Title>
          <PopoverDescription>
            <div>
              {requirement.explanation
                ? requirement.explanation
                : requirement.description}
            </div>
            {requirement.contacts && (
              <Container>
                <Title>Contacts:</Title>
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
              </Container>
            )}
            {requirement.urls && (
              <Container>
                <Title>Sources:</Title>
                <ul>
                  {requirement.urls.map((url) => (
                    <li key={url}>
                      <RefLink
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {url}
                      </RefLink>
                    </li>
                  ))}
                </ul>
              </Container>
            )}
          </PopoverDescription>
        </PopoverContent>
      );
    } else {
      return <div>The {name} major is not supported yet.</div>;
    }
  };

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
        <div>
          <span className="my-arrow root-arrow"></span>
          <span>{name}</span>
        </div>
      </Popover>
    </div>
  );
};

export default ReqDegreeLabel;
