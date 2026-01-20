/* eslint-disable react/no-unknown-property */
import React from 'react';

const IconHelp = ({
  className,
  color = '#777777',
}: {
  className?: string;
  color?: string;
}): JSX.Element => (
  <svg
    className={className}
    width='13'
    height='13'
    viewBox='0 0 13 13'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
  >
    <path
      d='M6.5 7.25879V8.77603'
      stroke={color}
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M6.87972 4.22404C6.87972 4.43352 6.70989 4.60335 6.5004 4.60335C6.29092 4.60335 6.12109 4.43352 6.12109 4.22404C6.12109 4.01455 6.29092 3.84473 6.5004 3.84473C6.70989 3.84473 6.87972 4.01455 6.87972 4.22404Z'
      stroke={color}
    />
    <path
      d='M12 6.5C12 9.53757 9.53757 12 6.5 12C3.46243 12 1 9.53757 1 6.5C1 3.46243 3.46243 1 6.5 1C9.53757 1 12 3.46243 12 6.5Z'
      stroke={color}
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

export default IconHelp;
