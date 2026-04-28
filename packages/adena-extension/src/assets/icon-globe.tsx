import React from 'react';

const IconGlobe = (): JSX.Element => (
  <svg
    width='26'
    height='26'
    viewBox='0 0 26 26'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
  >
    <g clipPath='url(#icon-globe-clip)'>
      <ellipse
        cx='13.0026'
        cy='12.9997'
        rx='2.97917'
        ry='7.85417'
        stroke='currentColor'
        strokeWidth='1.3'
      />
      <path
        d='M5.14844 13H20.8568'
        stroke='currentColor'
        strokeWidth='1.3'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <circle
        cx='13.0026'
        cy='12.9997'
        r='7.85417'
        stroke='currentColor'
        strokeWidth='1.3'
      />
    </g>
    <defs>
      <clipPath id='icon-globe-clip'>
        <rect width='26' height='26' fill='white' />
      </clipPath>
    </defs>
  </svg>
);

export default IconGlobe;
