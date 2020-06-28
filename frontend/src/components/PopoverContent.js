import React from 'react';
import styled from 'styled-components';

const PopoverContentStyled = styled.div`
  background-color: white;
  border-radius: 0.25rem;
  padding: 0.75rem;
  border: 1px solid #cbd5e0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  max-width: 300px;
  z-index: 2;
`;

const PopoverContent = (props) => {
  const { children } = props;
  return <PopoverContentStyled>{children}</PopoverContentStyled>;
};

export default PopoverContent;
