import React from 'react';
import styled, { CSSProp } from 'styled-components';
import Icon from './icons';
import Text from '@components/text';
import blurBg from '@assets/blur-bg.svg';

interface BlurScreenProps {
  hasText?: boolean;
  text?: string;
}

const BlurScreen = ({ hasText, text }: BlurScreenProps): JSX.Element => {
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
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'center', 'center')};
  ${({ theme }): CSSProp => theme.mixins.positionCenter()};
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

export default BlurScreen;
