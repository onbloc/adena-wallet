import React from 'react';

const IconClock = ({ className }: { className: string }) => {
  return (
    <svg
      className={className}
      width='28'
      height='28'
      viewBox='0 0 28 28'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <circle className='icon-primary' cx='14' cy='14' r='12' fill='#646486' />
      <path
        className='icon-default'
        fillRule='evenodd'
        clipRule='evenodd'
        d='M14 5.25C14.6904 5.25 15.25 5.80964 15.25 6.5V14.0833L18 17.75C18.4142 18.3023 18.3023 19.0858 17.75 19.5C17.1977 19.9142 16.4142 19.8023 16 19.25L12.75 14.9167V6.5C12.75 5.80964 13.3096 5.25 14 5.25Z'
        fill='#212128'
      />
    </svg>
  );
};

export default IconClock;
