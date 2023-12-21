import React from 'react';
import styled from 'styled-components';

import { Text, Icon } from '@components/atoms';
import blurBg from '@assets/blur-bg.svg';
import mixins from '@styles/mixins';

interface BlurScreenProps {
  hasText?: boolean;
  text?: string;
}

export const BlurScreen = ({ hasText, text }: BlurScreenProps): JSX.Element => {
  return (
    <>
      <Wrapper hasText={hasText}>
        <Icon name='iconHiddenEye' />
        {hasText && <Text type='captionReg'>{text}</Text>}
      </Wrapper>
    </>
  );
};

const Wrapper = styled.div<{ hasText?: boolean }>`
  ${mixins.flex('column', 'center', 'center')};
  ${mixins.positionCenter()};
  gap: ${({ hasText }): false | '21px' | undefined => hasText && '21px'};
  background: url(${blurBg}) no-repeat 100% 100% / 100% 100%;
  width: calc(100% - 12px);
  height: calc(100% - 12px);
  z-index: 10;
  backdrop-filter: blur(4px);
  border-radius: 18px;
  svg {
    width: 24px;
    height: 20px;
  }
`;
