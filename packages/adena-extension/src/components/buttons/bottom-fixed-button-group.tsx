import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import Button from './button';
import Text from '@components/text';

interface ButtonProps {
  primary?: boolean;
  disabled?: boolean;
  text: string;
  onClick: () => void;
}

interface BottomFixedButtonGroupProps {
  leftButton: ButtonProps,
  rightButton: ButtonProps,
  fill?: boolean;
}

function mapClassName(buttonProps: ButtonProps) {
  return `${buttonProps.primary && 'primary'} ${buttonProps.disabled && 'disabled'}`;
}

const BottomFixedButtonGroup = ({
  leftButton,
  rightButton,
  fill
}: BottomFixedButtonGroupProps) => {

  const leftClassName = useMemo(() => {
    return mapClassName(leftButton);
  }, [leftButton])

  const rightClassName = useMemo(() => {
    return mapClassName(rightButton);
  }, [rightButton])

  const onClickLeftButton = useCallback(() => {
    leftButton.onClick();
  }, [leftButton]);

  const onClickRightButton = useCallback(() => {
    rightButton.onClick();
  }, [rightButton]);

  return (
    <ButtonWrap fill={fill}>
      <Button
        className={leftClassName}
        fullWidth
        onClick={onClickLeftButton}
      >
        <Text type='body1Bold'>{leftButton.text}</Text>
      </Button>
      <Button
        className={rightClassName}
        fullWidth
        onClick={onClickRightButton}
      >
        <Text type='body1Bold'>{rightButton.text}</Text>
      </Button>
    </ButtonWrap>
  );
};

const ButtonWrap = styled.div<{ fill?: boolean }>`
  ${({ theme }) => theme.mixins.flexbox('row', 'flex-start', 'center')};
  position: fixed;
  left: 0px;
  width: 100%;
  padding: 0 20px;
  height: ${({ fill }) => fill ? '96px' : '48px'};
  bottom: ${({ fill }) => fill ? '0' : '24px'};
  ${({ fill }) => fill && 'box-shadow: 0px -4px 4px rgba(0, 0, 0, 0.4);'}
  ${({ fill }) => fill && 'align-items: center;'}
  background-color: ${({ fill, theme }) => fill ? theme.color.neutral[7] : 'transparent'};
  z-index: 1;
  

  & > button {
    margin-right: 10px;
    background-color: ${({ theme }) => theme.color.neutral[4]};

    &:last-child {
      margin-right: 0;
    }

    &:hover:not(.disabled) {
      background-color: ${({ theme }) => theme.color.neutral[5]};
    }

    &.primary {
      background-color: ${({ theme }) => theme.color.primary[3]};
      
      &:hover:not(.disabled) {  
        background-color: ${({ theme }) => theme.color.primary[4]};
      }
    }
  }

  & > button.disabled {
    cursor: default;
    color: ${({ theme }) => theme.color.neutral[4]};
    background-color: ${({ theme }) => theme.color.neutral[6]};

    &.primary {
      background-color: ${({ theme }) => theme.color.primary[6]};
    }
  }
`;

export default BottomFixedButtonGroup;
