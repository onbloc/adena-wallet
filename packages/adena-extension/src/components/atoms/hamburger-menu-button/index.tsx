import styled from 'styled-components';

import menu from '@assets/menu.svg';
import IconExpand from '@assets/expand.svg';

let op;
if (window.location.hash.indexOf('approve') === -1) {
  op = 1;
} else {
  op = 0;
}

export const HamburgerMenuBtn = styled.button`
  opacity: ${op};
  width: 24px;
  height: 24px;
  background: url(${menu}) no-repeat center center;
`;

export const ExpandBtn = styled.button`
  opacity: ${op};
  width: 24px;
  height: 24px;
  background: url(${IconExpand}) no-repeat center center;
`;
