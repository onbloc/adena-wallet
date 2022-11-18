import React from 'react';

const IconCancel = ({ className }: { className: string }) => {
  return (
    <svg
      className={className}
      width='12'
      height='12'
      viewBox='0 0 12 12'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <line
        x1='0.75'
        y1='-0.75'
        x2='12.4353'
        y2='-0.75'
        transform='matrix(0.703174 0.711018 -0.703174 0.711018 1 1.6875)'
        stroke='white'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
      <line
        x1='0.75'
        y1='-0.75'
        x2='12.4353'
        y2='-0.75'
        transform='matrix(-0.703174 0.711018 0.703174 0.711018 11 1.6875)'
        stroke='white'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
    </svg>
  );
};

export default IconCancel;
