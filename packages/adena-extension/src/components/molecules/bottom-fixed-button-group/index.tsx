import React, { ReactElement, useCallback, useMemo } from 'react';
import styled, { CSSProp } from 'styled-components';
import { Text, Button } from '@components/atoms';

interface ButtonProps {
  primary?: boolean;
  disabled?: boolean;
  text: string;
  onClick: () => void;
}

interface BottomFixedButtonGroupProps {
  leftButton: ButtonProps;
  rightButton: ButtonProps;
  filled?: boolean;
}

function mapClassName(buttonProps: ButtonProps): string {
  return `${buttonProps.primary && 'primary'} ${buttonProps.disabled && 'disabled'}`;
}

export const BottomFixedButtonGroup = ({
  leftButton,
  rightButton,
  filled,
}: BottomFixedButtonGroupProps): ReactElement => {
  const leftClassName = useMemo(() => {
    return mapClassName(leftButton);
  }, [leftButton]);

  const rightClassName = useMemo(() => {
    return mapClassName(rightButton);
  }, [rightButton]);

  const onClickLeftButton = useCallback(() => {
    leftButton.onClick();
  }, [leftButton]);

  const onClickRightButton = useCallback(() => {
    rightButton.onClick();
  }, [rightButton]);

  return (
    <ButtonWrap filled={filled}>
      <Button className={leftClassName} fullWidth onClick={onClickLeftButton}>
        <Text type='body1Bold'>{leftButton.text}</Text>
      </Button>
      <Button className={rightClassName} fullWidth onClick={onClickRightButton}>
        <Text type='body1Bold'>{rightButton.text}</Text>
      </Button>
    </ButtonWrap>
  );
};

const ButtonWrap = styled.div<{ filled?: boolean }>`
  ${({ theme }): CSSProp => theme.mixins.flexbox('row', 'flex-start', 'center')};
  position: fixed;
  left: 0px;
  width: 100%;
  padding: 0 20px;
  height: ${({ filled }): '48px' | '96px' => (filled ? '96px' : '48px')};
  bottom: ${({ filled }): '0' | '24px' => (filled ? '0' : '24px')};
  ${({ filled }): false | 'box-shadow: 0px -4px 4px rgba(0, 0, 0, 0.4);' | undefined =>
    filled && 'box-shadow: 0px -4px 4px rgba(0, 0, 0, 0.4);'}
  ${({ filled }): false | 'align-items: center;' | undefined => filled && 'align-items: center;'}
  background-color: ${({ filled, theme }): string =>
    filled ? theme.color.neutral[7] : 'transparent'};
  z-index: 1;

  & > button {
    margin-right: 10px;
    background-color: ${({ theme }): string => theme.color.neutral[4]};

    &:last-child {
      margin-right: 0;
    }

    &:hover:not(.disabled) {
      background-color: ${({ theme }): string => theme.color.neutral[5]};
    }

    &.primary {
      background-color: ${({ theme }): string => theme.color.primary[3]};

      &:hover:not(.disabled) {
        background-color: ${({ theme }): string => theme.color.primary[4]};
      }
    }
  }

  & > button.disabled {
    cursor: default;
    color: ${({ theme }): string => theme.color.neutral[4]};
    background-color: ${({ theme }): string => theme.color.neutral[6]};

    &.primary {
      background-color: ${({ theme }): string => theme.color.primary[6]};
    }
  }
`;
