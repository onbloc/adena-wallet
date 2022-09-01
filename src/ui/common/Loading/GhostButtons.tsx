import React from 'react';
import styled from 'styled-components';
import { modeVariants } from '../Button/FullButton';
import { textVariants } from '../Typography';

interface GhostButtonsProps {
  left: string;
  right: string;
  className?: string;
}

const GhostBtnWrap = styled.div`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'space-between')};
  width: 100%;
  gap: 10px;
`;

const GhostBtn = styled.button`
  ${modeVariants['ghost']};
  ${textVariants.body1Bold};
  width: 100%;
  height: 48px;
  border-radius: 30px;
  transition: all 0.4s ease;
  :disabled {
    color: ${({ theme }) => theme.color.neutral[3]};
    border: none;
  }
`;

const GhostButtons = ({ left, right, className }: GhostButtonsProps) => {
  return (
    <GhostBtnWrap className={className}>
      <GhostBtn disabled>{left}</GhostBtn>
      <GhostBtn disabled>{right}</GhostBtn>
    </GhostBtnWrap>
  );
};

export default GhostButtons;
