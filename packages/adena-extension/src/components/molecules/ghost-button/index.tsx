import React from 'react';
import styled from 'styled-components';

import { Button, ButtonHierarchy } from '@components/atoms';
import mixins from '@styles/mixins';
import theme, { fonts } from '@styles/theme';

interface GhostButtonsProps {
  left: string;
  right: string;
  className?: string;
}

const GhostBtnWrap = styled.div`
  ${mixins.flex('row', 'center', 'space-between')};
  width: 100%;
  gap: 10px;
`;

const GhostBtn = styled(Button)`
  ${fonts.body1Bold};
  transition: all 0.4s ease;
  :disabled {
    color: ${theme.color.neutral[3]};
    border: none;
  }
`;

export const GhostButtons = ({ left, right, className }: GhostButtonsProps): JSX.Element => {
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
