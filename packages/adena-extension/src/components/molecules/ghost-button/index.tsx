import React from 'react';
import styled from 'styled-components';

import { Button } from '@components/atoms';
import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';

interface GhostButtonsProps {
  left: string;
  right: string;
  className?: string;
}

const GhostBtnWrap = styled.div`
  ${mixins.flex({ direction: 'row', justify: 'space-between' })};
  width: 100%;
  gap: 10px;
`;

const GhostBtn = styled(Button)`
  ${fonts.body1Bold};
  transition: all 0.4s ease;
  :disabled {
    color: ${getTheme('neutral', '_4')};
    border: none;
  }
`;

export const GhostButtons = ({ left, right, className }: GhostButtonsProps): JSX.Element => {
  return (
    <GhostBtnWrap className={className}>
      <GhostBtn fullWidth height='48px' hierarchy='ghost' disabled>
        {left}
      </GhostBtn>
      <GhostBtn fullWidth height='48px' hierarchy='ghost' disabled>
        {right}
      </GhostBtn>
    </GhostBtnWrap>
  );
};
