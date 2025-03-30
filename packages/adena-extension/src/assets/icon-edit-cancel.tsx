/* eslint-disable react/no-unknown-property */

const IconEditCancel = ({ className }: { className: string }): JSX.Element => (
  <svg
    className={className}
    width='16'
    height='16'
    viewBox='0 0 16 16'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
  >
    <line
      x1='0.75'
      y1='-0.75'
      x2='12.4353'
      y2='-0.75'
      transform='matrix(0.703174 0.711018 -0.703174 0.711018 3 3.6875)'
      stroke='#A3A3B5'
      strokeWidth='1.5'
      strokeLinecap='round'
    />
    <line
      x1='0.75'
      y1='-0.75'
      x2='12.4353'
      y2='-0.75'
      transform='matrix(-0.703174 0.711018 0.703174 0.711018 13 3.6875)'
      stroke='#A3A3B5'
      strokeWidth='1.5'
      strokeLinecap='round'
    />
  </svg>
);

export default IconEditCancel;
