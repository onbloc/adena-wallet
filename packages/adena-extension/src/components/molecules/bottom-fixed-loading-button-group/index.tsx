import React, { ReactElement, useCallback, useMemo } from 'react';

import { Button, Text } from '@components/atoms';
import { IconButtonLoading } from '@components/atoms/icon/icon-assets';
import mixins from '@styles/mixins';
import { getTheme } from '@styles/theme';
import styled from 'styled-components';

interface ButtonProps {
  primary?: boolean;
  disabled?: boolean;
  loading?: boolean;
  text: string;
  onClick: () => void;
}

interface BottomFixedLoadingButtonGroupProps {
  leftButton: ButtonProps;
  rightButton: ButtonProps;
  filled?: boolean;
}

function mapClassName(buttonProps: ButtonProps): string {
  return `${buttonProps.primary && 'primary'} ${buttonProps.disabled && 'disabled'}`;
}

export const BottomFixedLoadingButtonGroup = ({
  leftButton,
  rightButton,
  filled,
}: BottomFixedLoadingButtonGroupProps): ReactElement => {
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
      <LoadingButton
        className={leftClassName}
        loading={leftButton.loading}
        text={leftButton.text}
        onClick={onClickLeftButton}
      />
      <LoadingButton
        className={rightClassName}
        loading={rightButton.loading}
        text={rightButton.text}
        onClick={onClickRightButton}
      />
    </ButtonWrap>
  );
};

interface LoadingButtonProps {
  loading?: boolean;
  className?: string;
  text: string;
  onClick: () => void;
}

const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading,
  className,
  text,
  onClick,
}: LoadingButtonProps) => {
  return (
    <Button className={className} fullWidth onClick={onClick}>
      {loading ? <IconButtonLoading /> : <Text type='body1Bold'>{text}</Text>}
    </Button>
  );
};

const ButtonWrap = styled.div<{ filled?: boolean }>`
  ${mixins.flex({ direction: 'row', align: 'flex-start' })};
  position: fixed;
  left: 0px;
  width: 100%;
  padding: 0 20px;
  height: ${({ filled }): '48px' | '96px' => (filled ? '96px' : '48px')};
  bottom: ${({ filled }): '0' | '24px' => (filled ? '0' : '24px')};
  ${({ filled }): false | 'box-shadow: 0px -4px 4px rgba(0, 0, 0, 0.4);' | undefined =>
    filled && 'box-shadow: 0px -4px 4px rgba(0, 0, 0, 0.4);'}
  ${({ filled }): false | 'align-items: center;' | undefined => filled && 'align-items: center;'}
  background-color: ${({ filled, theme }): string => (filled ? theme.neutral._8 : 'transparent')};
  z-index: 1;

  & > button {
    margin-right: 10px;
    background-color: ${getTheme('neutral', '_5')};

    &:last-child {
      margin-right: 0;
    }

    &:hover:not(.disabled) {
      background-color: ${getTheme('neutral', '_6')};
    }

    &.primary {
      background-color: ${getTheme('primary', '_6')};

      &:hover:not(.disabled) {
        background-color: ${getTheme('primary', '_7')};
      }
    }
  }

  & > button.disabled {
    cursor: default;
    color: ${getTheme('neutral', '_5')};
    background-color: ${getTheme('neutral', '_7')};

    &.primary {
      background-color: ${getTheme('primary', '_9')};
    }
  }
`;
