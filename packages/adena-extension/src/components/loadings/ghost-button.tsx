import React from 'react';
import styled from 'styled-components';
import Button, { ButtonHierarchy, modeVariants } from '../buttons/button';

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

const GhostBtn = styled(Button)`
  ${({ theme }) => theme.fonts.body1Bold};
  transition: all 0.4s ease;
  :disabled {
    color: ${({ theme }) => theme.color.neutral[3]};
    border: none;
  }
`;

export const GhostButtons = ({ left, right, className }: GhostButtonsProps) => {
  return (
    <GhostBtnWrap className={className}>
      <GhostBtn fullWidth height='48px' hierarchy={ButtonHierarchy.Ghost} disabled>
        {left}
      </GhostBtn>
      <GhostBtn fullWidth height='48px' hierarchy={ButtonHierarchy.Ghost} disabled>
        {right}
      </GhostBtn>
    </GhostBtnWrap>
  );
};
