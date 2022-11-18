import React from 'react';

const IconSearch = ({ className }: { className: string }) => {
  return (
    <svg
      className={className}
      width='23'
      height='25'
      viewBox='0 0 23 25'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        className='icon-primary'
        d='M14.7002 16.1548C14.0154 16.716 13.9153 17.7261 14.4765 18.4108L18.6187 23.4646C19.18 24.1493 20.19 24.2495 20.8748 23.6882C21.5595 23.127 21.6597 22.1169 21.0984 21.4322L16.9562 16.3784C16.395 15.6937 15.3849 15.5936 14.7002 16.1548Z'
        fill='#646486'
      />
      <path
        className='icon-default'
        d='M10 20C15.5228 20 20 15.5228 20 10C20 4.47715 15.5228 0 10 0C4.47715 0 0 4.47715 0 10C0 15.5228 4.47715 20 10 20Z'
        fill='#646486'
      />
      <path
        d='M10 17C13.866 17 17 13.866 17 10C17 6.13401 13.866 3 10 3C6.13401 3 3 6.13401 3 10C3 13.866 6.13401 17 10 17Z'
        fill='#212128'
      />
    </svg>
  );
};

export default IconSearch;
