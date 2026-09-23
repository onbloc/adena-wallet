import React from 'react';

// Outline padlock used to mark a vesting-locked balance. `currentColor` lets
// the same icon serve the token row (neutral.a) and the vesting panel's
// lighter label colour without duplicating the artwork.
const IconLockOutline = (): JSX.Element => (
  <svg width='9' height='10' viewBox='0 0 9.2 10.2' fill='none' xmlns='http://www.w3.org/2000/svg'>
    <path
      d='M7.6 4.6H1.6C1.04772 4.6 0.6 5.04772 0.6 5.6V8.6C0.6 9.15228 1.04772 9.6 1.6 9.6H7.6C8.15228 9.6 8.6 9.15228 8.6 8.6V5.6C8.6 5.04772 8.15228 4.6 7.6 4.6Z'
      stroke='currentColor'
      strokeWidth='1.2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M2.6 4.6V2.6C2.6 2.06957 2.81071 1.56086 3.18579 1.18579C3.56086 0.810714 4.06957 0.6 4.6 0.6C5.13043 0.6 5.63914 0.810714 6.01421 1.18579C6.38929 1.56086 6.6 2.06957 6.6 2.6V4.6'
      stroke='currentColor'
      strokeWidth='1.2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

export default IconLockOutline;
