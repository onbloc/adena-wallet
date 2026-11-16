import React, { ReactElement } from 'react';
import styled, { keyframes } from 'styled-components';

const rotate = keyframes`
  from {
    -webkit-transform: rotate(0deg);
    -o-transform: rotate(0deg);
    transform: rotate(0deg);
  }
  to {
    -webkit-transform: rotate(360deg);
    -o-transform: rotate(360deg);
    transform: rotate(360deg);
  }
`;

const SVG = styled.svg`
  width: 00px;
  height: 00px;
  margin: 0 auto;
  animation: ${rotate} 1.5s infinite;
`;

const IconSpinnerLoading = ({ className }: { className: string }): ReactElement => {
  return (
    <SVG
      width='100'
      height='100'
      viewBox='0 0 100 100'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className={className}
    >
      <rect width='100' height='100' rx='50' fill='#191920' />
      <path
        fillRule='evenodd'
        clipRule='evenodd'
        d='M30.9995 69.0016C41.4932 79.4953 58.5068 79.4953 69.0005 69.0016C79.4942 58.5079 79.4942 41.4942 69.0005 31.0005C58.5068 20.5068 41.4932 20.5068 30.9995 31.0005C20.5058 41.4942 20.5058 58.5079 30.9995 69.0016ZM40.2283 59.7722C45.6251 65.1689 54.3749 65.1689 59.7717 59.7722C65.1685 54.3754 65.1685 45.6255 59.7717 40.2288C54.3749 34.832 45.6251 34.832 40.2283 40.2288C34.8315 45.6255 34.8315 54.3754 40.2283 59.7722Z'
        fill='url(#paint0_linear_4554_105222)'
      />
      <circle cx='43' cy='31.0078' r='7' fill='#0059FF' />
      <defs>
        <linearGradient
          id='paint0_linear_4554_105222'
          x1='34.6853'
          y1='66.271'
          x2='57.7026'
          y2='43.1492'
          gradientUnits='userSpaceOnUse'
        >
          <stop stopColor='#0059FF' />
          <stop offset='1' stopColor='#0058C9' stopOpacity='0' />
        </linearGradient>
      </defs>
    </SVG>
  );
};

export default IconSpinnerLoading;
