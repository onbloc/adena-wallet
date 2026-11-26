import { Button, Text } from '@components/atoms';
import { IconButtonLoading } from '@components/atoms/icon/icon-assets';
import React, { ReactElement, useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { ApproveHoldButton } from '../approve-hold-button/approve-hold-button';
import { ButtonWrap as FixedButtonWrap } from '../bottom-fixed-button-group';

interface ButtonProps {
  primary?: boolean;
  disabled?: boolean;
  loading?: boolean;
  text: string;
  onClick: () => void;
}

interface HoldButtonProps {
  type: 'hold';
  onFinishHold: (finished: boolean) => void;
}

interface BottomFixedLoadingButtonGroupProps {
  leftButton: ButtonProps;
  rightButton: ButtonProps | HoldButtonProps;
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

  const onClickLeftButton = useCallback(() => {
    leftButton.onClick();
  }, [leftButton]);

  // Check if rightButton is hold type
  const isHoldButton = 'type' in rightButton && rightButton.type === 'hold';

  const rightClassName = useMemo(() => {
    if (isHoldButton) return '';
    return mapClassName(rightButton as ButtonProps);
  }, [rightButton, isHoldButton]);

  const onClickRightButton = useCallback(() => {
    if (!isHoldButton) {
      (rightButton as ButtonProps).onClick();
    }
  }, [rightButton, isHoldButton]);

  return (
    <ButtonWrap $filled={filled}>
      <LoadingButton
        className={leftClassName}
        loading={leftButton.loading}
        text={leftButton.text}
        onClick={onClickLeftButton}
      />

      {isHoldButton
        ? (
            <ApproveHoldButton
              onFinishHold={
                (rightButton as HoldButtonProps).onFinishHold
              }
            />
          )
        : (
            <LoadingButton
              className={rightClassName}
              loading={(rightButton as ButtonProps).loading}
              text={(rightButton as ButtonProps).text}
              onClick={onClickRightButton}
            />
          )}
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

const ButtonWrap = styled(FixedButtonWrap)`
  z-index: 9;
`;
