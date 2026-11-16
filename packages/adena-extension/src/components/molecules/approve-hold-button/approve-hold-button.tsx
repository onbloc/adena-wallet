import React, { useCallback, useEffect, useState } from 'react';
import { Text } from '@components/atoms';
import { StyledHoldButton, StyledButtonContent } from './approve-hold-button.styles';
import InfoTooltip from '@components/atoms/info-tooltip/info-tooltip';

interface HoldButtonProps {
  onFinishHold: (finished: boolean) => void;
}

const APPROVE_HOLD_TOOLTIP_MESSAGE = (
  <>
    <b style={{ fontWeight: 700 }}>WARNING:</b> Parameter changes have been detected. Hold to
    proceed only if you trust the updated parameters.
  </>
);

export const ApproveHoldButton: React.FC<HoldButtonProps> = ({ onFinishHold }) => {
  const [pressed, setPressed] = useState(false);
  const [finish, setFinish] = useState(false);

  const endEvent = useCallback((): void => {
    if (pressed) {
      setPressed(false);
    }
  }, [pressed]);

  const onMouseDown = useCallback(() => {
    if (finish) {
      setFinish(false);
      return;
    }
    setPressed(true);
  }, [finish]);

  const onMouseUp = useCallback(() => {
    endEvent();
  }, [endEvent]);

  const onMouseLeave = useCallback(() => {
    endEvent();
  }, [endEvent]);

  useEffect(() => {
    onFinishHold(finish);
  }, [finish, onFinishHold]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (pressed) {
      timer = setTimeout(() => {
        setFinish(true);
      }, 3000);
    }

    return () => {
      clearTimeout(timer);
    };
  }, [pressed]);

  return (
    <StyledHoldButton
      pressed={pressed}
      finish={finish}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
    >
      <StyledButtonContent>
        <Text type='body1Bold'>Hold</Text>
        <InfoTooltip content={APPROVE_HOLD_TOOLTIP_MESSAGE} iconColor='#FFFFFF' />
      </StyledButtonContent>
    </StyledHoldButton>
  );
};
