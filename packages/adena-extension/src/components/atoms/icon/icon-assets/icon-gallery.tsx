import React, { ReactElement } from 'react';

const IconGallery = ({ className }: { className: string }): ReactElement => {
  return (
    <svg
      className={className}
      width='28'
      height='28'
      viewBox='0 0 28 28'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <rect className='icon-primary' x='2' y='2' width='11' height='11' rx='2' fill='#646486' />
      <rect className='icon-primary' x='2' y='15' width='11' height='11' rx='2' fill='#646486' />
      <rect className='icon-default' x='15' y='2' width='11' height='11' rx='2' fill='#646486' />
      <rect className='icon-primary' x='15' y='15' width='11' height='11' rx='2' fill='#646486' />
    </svg>
  );
};

export default IconGallery;
