import React from 'react';

const IconConnectFailed = ({ className }: { className: string }) => {
  return (
    <svg
      className={className}
      width='100'
      height='100'
      viewBox='0 0 100 100'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <rect width='100' height='100' rx='50' fill='#EF2D21' fill-opacity='0.2' />
      <circle cx='50' cy='50' r='32' fill='#EF2D21' />
      <rect x='34' y='45' width='32' height='10' fill='#4A2327' />
    </svg>
  );
};

export default IconConnectFailed;
