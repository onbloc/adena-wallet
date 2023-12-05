import React, { ReactElement } from 'react';

const IconArrowV2 = ({ className }: { className?: string }): ReactElement => {
  return (
    <svg
      width='6'
      height='10'
      viewBox='0 0 6 10'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className={className}
    >
      <path
        d='M1 9L5 5L1 1'
        stroke='#777777'
        strokeWidth='1.5'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
};

export default IconArrowV2;
