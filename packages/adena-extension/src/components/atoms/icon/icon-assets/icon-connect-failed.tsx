import React, { ReactElement } from 'react';

const IconConnectFailed = ({ className }: { className: string }): ReactElement => {
  return (
    <svg
      width='100'
      height='100'
      viewBox='0 0 100 100'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className={className}
    >
      <path
        fillRule='evenodd'
        clipRule='evenodd'
        d='M50 100C77.6142 100 100 77.6142 100 50C100 22.3858 77.6142 0 50 0C22.3858 0 0 22.3858 0 50C0 77.6142 22.3858 100 50 100ZM22.364 71.4974L43.5 50.3614L22 28.8614L28.364 22.4975L49.8639 43.9974L71.8614 21.9999L78.2254 28.3639L56.2279 50.3614L77.8614 71.9949L71.4975 78.3589L49.8639 56.7254L28.7279 77.8614L22.364 71.4974Z'
        fill='#EF2D21'
      />
    </svg>
  );
};

export default IconConnectFailed;
