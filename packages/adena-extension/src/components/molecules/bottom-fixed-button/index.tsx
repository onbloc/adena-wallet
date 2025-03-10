import React from 'react';
import styled, { css, RuleSet } from 'styled-components';

import { Button, ButtonProps, Text } from '@components/atoms';
import mixins from '@styles/mixins';

interface BottomFixedButtonProps {
  hierarchy?: ButtonProps['hierarchy'];
  text?: string;
  fill?: boolean;
  disabled?: boolean;
  onClick: () => unknown;
}

export const BottomFixedButton = ({
  hierarchy = 'dark',
  text = 'Close',
  fill = true,
  disabled = false,
  onClick,
}: BottomFixedButtonProps): JSX.Element => {
  const onClickButton = React.useCallback(() => {
    onClick();
  }, [onClick]);

  return (
    <ButtonWrap fill={fill ? 'fill' : 'none'}>
      <Button fullWidth hierarchy={hierarchy} disabled={disabled} onClick={onClickButton}>
        <Text type='body1Bold'>{text}</Text>
      </Button>
    </ButtonWrap>
  );
};

const ButtonWrap = styled.div<{ fill: string }>`
  ${mixins.flex({ direction: 'row' })};
  position: fixed;
  bottom: 0px;
  left: 0px;
  width: 100%;
  height: 96px;
  padding: 0px 20px;
  z-index: 1;

  ${({ fill, theme }): RuleSet =>
    fill === 'fill'
      ? css`
          box-shadow: 0px -4px 4px rgba(0, 0, 0, 0.4);
          background-color: ${theme.neutral._8};
        `
      : css`
          background-color: transparent;
        `}
`;
