import React, { useEffect } from 'react';
import { useState } from 'react';
import styled from 'styled-components';
import menu from '../../../assets/menu.svg';
import { useLocation } from 'react-router-dom';

// export const Tmp = () => {
//   const location = useLocation();
//   const [isApprove, setIsApprove] = useState(100);
//
//   useEffect(() => {
//     if (location.pathname.indexOf('approve') === -1) {
//       setIsApprove(1);
//     } else {
//       setIsApprove(0);
//     }
//   }, [location]);
//
//   return isApprove;
// };

let op;
if (window.location.hash.indexOf('approve') === -1) {
  // no approve
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
