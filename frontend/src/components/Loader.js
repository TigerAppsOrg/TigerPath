import React from 'react';
import styled from 'styled-components';

const LoaderStyled = styled.span`
  & > span {
    width: ${({ size }) => size}px;
    height: ${({ size }) => size}px;
    background-color: ${({ theme }) => theme.lightGrey};

    border-radius: 100%;
    display: inline-block;
    animation: sk-bouncedelay 0.8s infinite ease-in-out both;
  }

  & .bounce1 {
    animation-delay: -0.32s;
  }

  & .bounce2 {
    animation-delay: -0.16s;
  }

  @keyframes sk-bouncedelay {
    0%,
    80%,
    100% {
      transform: scale(0);
    }
    40% {
      transform: scale(1);
    }
  }
`;

const Loader = (props) => {
  const { className, size = 18 } = props;

  return (
    <LoaderStyled className={className} size={size}>
      <span className="bounce1"></span>
      <span className="bounce2"></span>
      <span className="bounce3"></span>
    </LoaderStyled>
  );
};

export default Loader;
