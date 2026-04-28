import React, { ReactElement } from 'react';

const IconSecurity = ({ className }: { className?: string }): ReactElement => {
  return (
    <svg
      className={className}
      width='18'
      height='18'
      viewBox='0 0 18 18'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <g transform='rotate(180 9 9)'>
        <path
          d='M3 13.13V8.435C3 7.8464 3.27712 7.29216 3.748 6.939L7.878 3.8415C8.54289 3.34283 9.45711 3.34283 10.122 3.8415L14.252 6.939C14.7229 7.29216 15 7.8464 15 8.435V13.13C15 14.1628 14.1628 15 13.13 15H4.87C3.83723 15 3 14.1628 3 13.13Z'
          stroke='#777777'
          strokeWidth='1.3'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </g>
    </svg>
  );
};

export default IconSecurity;
