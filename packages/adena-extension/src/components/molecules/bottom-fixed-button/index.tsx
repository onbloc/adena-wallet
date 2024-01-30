import React, { useCallback } from 'react';
import styled, { css, FlattenSimpleInterpolation } from 'styled-components';

import { Button, ButtonProps, Text } from '@components/atoms';
import mixins from '@styles/mixins';

interface BottomFixedButtonProps {
  hierarchy?: ButtonProps['hierarchy'];
  text?: string;
  fill?: boolean;
  onClick: () => unknown;
}

export const BottomFixedButton = ({
  hierarchy = 'dark',
  text = 'Close',
  fill = true,
  onClick,
}: BottomFixedButtonProps): JSX.Element => {
  const onClickButton = useCallback(() => {
    onClick();
  }, [onClick]);

  return (
    <ButtonWrap fill={fill}>
      <Button fullWidth hierarchy={hierarchy} onClick={onClickButton}>
        <Text type='body1Bold'>{text}</Text>
      </Button>
    </ButtonWrap>
  );
};

const ButtonWrap = styled.div<{ fill: boolean }>`
  ${mixins.flex({ direction: 'row' })};
  position: fixed;
  bottom: 0px;
  left: 0px;
  width: 100%;
  height: 96px;
  padding: 0px 20px;
  z-index: 1;

  ${({ fill, theme }): FlattenSimpleInterpolation =>
    fill
      ? css`
        box-shadow: 0px -4px 4px rgba(0, 0, 0, 0.4);
        background-color: ${theme.neutral._8};
        `
      : css`
        background-color: transparent;
      `}
`;
