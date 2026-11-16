import React, { ReactElement } from 'react';

const IconBook = ({ className }: { className?: string }): ReactElement => {
  return (
    <svg
      className={className}
      width='18'
      height='18'
      viewBox='0 0 18 18'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        d='M13 2.4375H4C3.17157 2.4375 2.5 3.10907 2.5 3.9375V12.2996V13.9375C2.5 14.7659 3.17157 15.4375 4 15.4375H14C14.2761 15.4375 14.5 15.2136 14.5 14.9375V3.9375C14.5 3.10907 13.8284 2.4375 13 2.4375Z'
        stroke='#777777'
        strokeWidth='1.3'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <path
        d='M6.5 6.4375H10.5'
        stroke='#777777'
        strokeWidth='1.3'
        strokeLinecap='round'
      />
      <path
        d='M14.5 13.4375H4C3.17157 13.4375 2.5 13.8852 2.5 14.4375'
        stroke='#777777'
        strokeWidth='1.3'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
};

export default IconBook;
