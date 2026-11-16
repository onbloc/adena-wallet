import React, { ReactElement } from 'react';

const IconGlobe = ({ className }: { className?: string }): ReactElement => {
  return (
    <svg
      className={className}
      width='18'
      height='18'
      viewBox='0 0 18 18'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <ellipse cx='9' cy='9' rx='3' ry='7' stroke='#777777' strokeWidth='1.3' />
      <path
        d='M2 10H16'
        stroke='#777777'
        strokeWidth='1.3'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <circle cx='9' cy='9' r='7' stroke='#777777' strokeWidth='1.3' />
    </svg>
  );
};

export default IconGlobe;
