import styled from 'styled-components';

export const TreeLabel = styled.span`
  display: flex;
  flex: 1;
  overflow: hidden;
  user-select: none;
`;

export const TreeNameContainer = styled.span`
  display: flex;
  justify-content: space-between;
  flex: 1;
  overflow: hidden;
`;

export const TreeName = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const PopoverDescription = styled.div`
  margin-top: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
  overflow-wrap: break-word;
  white-space: pre-wrap;
`;
