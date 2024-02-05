import React, { CSSProperties, useCallback, useEffect, useState } from 'react';
import styled, { css, FlattenSimpleInterpolation, keyframes, useTheme } from 'styled-components';

import { WebText } from '../web-text';
import { View } from '../base';

interface WebHoldButtonProps {
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
  text?: string;
  onFinishHold: (result: boolean) => void;
}

const fill = keyframes`
  from {
   width: 0;
  }
  to {
   width: 100%;
  }
`;

const StyledContainer = styled(View) <{ pressed: boolean }>`
  position: relative;
  overflow: hidden;
  display: flex;
  height: 32px;
  padding: 8px 16px;
  justify-content: center;
  align-items: center;
  border-radius: 8px;
  border: 1px solid #212429;
  background: transparent;
  cursor: pointer;
  user-select:none;

  :hover {
    background: rgba(255, 255, 255, 0.08);
  }

  ${({ pressed }): FlattenSimpleInterpolation | string => pressed ? css`
          ::before {
            content: '';
            z-index: -1;
            position: absolute;
            top: 0px;
            left: 0px;
            height: 100%;
            background: rgba(0, 89, 255, 0.32);
            border-radius: 8px;
            animation: ${fill} 3s forwards; 
          }
  `: ''}
`;

export const WebHoldButton: React.FC<WebHoldButtonProps> = ({
  width = 'fit-content',
  height = 32,
  text = 'Hold to Reveal',
  onFinishHold,
}) => {
  const theme = useTheme();
  const [pressed, setPressed] = useState(false);
  const [mouseover, setMouseover] = useState(false);

  const endEvent = useCallback((): void => {
    setMouseover(false);
    if (pressed) {
      setPressed(false);
      onFinishHold(false);
    }
  }, [pressed]);

  const onMouseDown = useCallback(() => {
    setMouseover(true);
    setPressed(true);
  }, [endEvent]);

  const onMouseOver = useCallback(() => {
    setMouseover(true);
  }, []);

  const onMouseUp = useCallback(() => {
    endEvent();
  }, [endEvent]);

  const onMouseLeave = useCallback(() => {
    endEvent();
  }, [endEvent]);


  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (pressed) {
      timer = setTimeout(() => {
        onFinishHold(true);
      }, 3000);
    }

    return () => {
      clearTimeout(timer);
    };
  }, [pressed, onFinishHold]);

  return (
    <StyledContainer
      style={{
        width,
        height,
      }}
      pressed={pressed}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseOver={onMouseOver}
      onMouseLeave={onMouseLeave}
      onMouseOut={onMouseLeave}
    >
      <WebText
        color={mouseover ? theme.webNeutral._100 : theme.webNeutral._500}
        type='body6'
      >
        {text}
      </WebText>
    </StyledContainer>
  );
};
