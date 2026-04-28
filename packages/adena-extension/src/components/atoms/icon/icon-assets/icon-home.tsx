import React, { ReactElement } from 'react';
import styled from 'styled-components';

import { getTheme } from '@styles/theme';

const StyledSvg = styled.svg`
  path {
    fill: #646486;
    transition: fill 0.3s ease;
  }

  &:hover path {
    fill: #51555c;
  }

  &.active path {
    fill: ${getTheme('primary', '_6')};
  }
`;

const IconHome = ({ className }: { className: string }): ReactElement => {
  return (
    <StyledSvg
      className={className}
      width='28'
      height='28'
      viewBox='0 0 28 28'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path d='M16.2519 4.27168C14.9274 3.24147 13.0726 3.24147 11.7481 4.27168L4.91606 9.58546C4.02259 10.2804 3.5 11.3489 3.5 12.4808V20.8324C3.5 22.8582 5.14222 24.5004 7.168 24.5004H10.15C11.1165 24.5004 11.9 23.7169 11.9 22.7504V19.1085C11.9 18.838 11.9472 18.6889 11.9962 18.6105C12.1725 18.3278 12.4079 18.0842 12.6882 17.8973C13.0763 17.6386 13.5328 17.5004 14 17.5004C14.4672 17.5004 14.9237 17.6386 15.3118 17.8973C15.5921 18.0842 15.8275 18.3278 16.0038 18.6105C16.0528 18.6889 16.1 18.838 16.1 19.1085V22.7504C16.1 23.7169 16.8835 24.5004 17.85 24.5004H20.832C22.8578 24.5004 24.5 22.8582 24.5 20.8324V12.4808C24.5 11.3489 23.9774 10.2804 23.0839 9.58546L16.2519 4.27168Z' />
    </StyledSvg>
  );
};

export default IconHome;
