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

const SVGWrapper = styled.div`
  display: flex;
  width: 20px;
  height: 20px;
  overflow: visible;
  justify-content: center;
  align-items: center;
  padding-left: 16px;
  padding-top: 16px;
  animation: ${rotate} 1.5s infinite;

  svg {
    display: flex;
    flex-shrink: 0;
    width: 60px;
    height: 60px;
  }
`;

const IconButtonLoading = (): ReactElement => {
  return (
    <SVGWrapper>
      <svg
        width='60'
        height='60'
        viewBox='0 0 60 60'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
      >
        <g filter='url(#filter0_d_9215_2346)'>
          <mask id='path-1-inside-1_9215_2346' fill='white'>
            <path d='M12 22C12 23.9778 12.5865 25.9112 13.6853 27.5557C14.7841 29.2002 16.3459 30.4819 18.1732 31.2388C20.0004 31.9957 22.0111 32.1937 23.9509 31.8079C25.8907 31.422 27.6725 30.4696 29.0711 29.0711C30.4696 27.6725 31.422 25.8907 31.8079 23.9509C32.1937 22.0111 31.9957 20.0004 31.2388 18.1732C30.4819 16.3459 29.2002 14.7841 27.5557 13.6853C25.9112 12.5865 23.9778 12 22 12V14.6885C23.4461 14.6885 24.8597 15.1174 26.062 15.9207C27.2644 16.7241 28.2015 17.866 28.7549 19.202C29.3083 20.538 29.4531 22.0081 29.171 23.4264C28.8889 24.8447 28.1925 26.1475 27.17 27.17C26.1475 28.1925 24.8447 28.8889 23.4264 29.171C22.0081 29.4531 20.538 29.3083 19.202 28.7549C17.866 28.2015 16.7241 27.2644 15.9207 26.062C15.1173 24.8597 14.6885 23.4461 14.6885 22H12Z' />
          </mask>
          <path
            d='M12 22C12 23.9778 12.5865 25.9112 13.6853 27.5557C14.7841 29.2002 16.3459 30.4819 18.1732 31.2388C20.0004 31.9957 22.0111 32.1937 23.9509 31.8079C25.8907 31.422 27.6725 30.4696 29.0711 29.0711C30.4696 27.6725 31.422 25.8907 31.8079 23.9509C32.1937 22.0111 31.9957 20.0004 31.2388 18.1732C30.4819 16.3459 29.2002 14.7841 27.5557 13.6853C25.9112 12.5865 23.9778 12 22 12V14.6885C23.4461 14.6885 24.8597 15.1174 26.062 15.9207C27.2644 16.7241 28.2015 17.866 28.7549 19.202C29.3083 20.538 29.4531 22.0081 29.171 23.4264C28.8889 24.8447 28.1925 26.1475 27.17 27.17C26.1475 28.1925 24.8447 28.8889 23.4264 29.171C22.0081 29.4531 20.538 29.3083 19.202 28.7549C17.866 28.2015 16.7241 27.2644 15.9207 26.062C15.1173 24.8597 14.6885 23.4461 14.6885 22H12Z'
            stroke='url(#paint0_angular_9215_2346)'
            strokeWidth='24'
            shapeRendering='crispEdges'
            mask='url(#path-1-inside-1_9215_2346)'
          />
        </g>
        <defs>
          <filter
            id='filter0_d_9215_2346'
            x='0'
            y='0'
            width='60'
            height='60'
            filterUnits='userSpaceOnUse'
            colorInterpolationFilters='sRGB'
          >
            <feFlood floodOpacity='0' result='BackgroundImageFix' />
            <feColorMatrix
              in='SourceAlpha'
              type='matrix'
              values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
              result='hardAlpha'
            />
            <feOffset dx='8' dy='8' />
            <feGaussianBlur stdDeviation='10' />
            <feComposite in2='hardAlpha' operator='out' />
            <feColorMatrix type='matrix' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0' />
            <feBlend mode='normal' in2='BackgroundImageFix' result='effect1_dropShadow_9215_2346' />
            <feBlend
              mode='normal'
              in='SourceGraphic'
              in2='effect1_dropShadow_9215_2346'
              result='shape'
            />
          </filter>
          <radialGradient
            id='paint0_angular_9215_2346'
            cx='0'
            cy='0'
            r='1'
            gradientUnits='userSpaceOnUse'
            gradientTransform='translate(22 22.125) rotate(-90) scale(10.125)'
          >
            <stop stopColor='white' />
            <stop offset='1' stopColor='white' stopOpacity='0.2' />
          </radialGradient>
        </defs>
      </svg>
    </SVGWrapper>
  );
};

export default IconButtonLoading;
