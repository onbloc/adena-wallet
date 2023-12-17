import React, { useCallback } from 'react';
import styled, { CSSProp } from 'styled-components';

import { Button, Text, ButtonHierarchy } from '@components/atoms';

interface BottomFixedButtonProps {
  hierarchy?: ButtonHierarchy;
  onClick: () => unknown;
  text?: string;
}

export const BottomFixedButton = ({
  hierarchy = ButtonHierarchy.Dark,
  onClick,
  text = 'Close',
}: BottomFixedButtonProps): JSX.Element => {
  const onClickButton = useCallback(() => {
    onClick();
  }, [onClick]);

  return (
    <ButtonWrap>
      <Button fullWidth hierarchy={hierarchy} onClick={onClickButton}>
        <Text type='body1Bold'>{text}</Text>
      </Button>
    </ButtonWrap>
  );
};

const ButtonWrap = styled.div`
  ${({ theme }): CSSProp => theme.mixins.flexbox('row', 'center', 'center')};
  position: fixed;
  bottom: 0px;
  left: 0px;
  width: 100%;
  height: 96px;
  padding: 0px 20px;
  box-shadow: 0px -4px 4px rgba(0, 0, 0, 0.4);
  background-color: ${({ theme }): string => theme.color.neutral[7]};
  z-index: 1;
`;
