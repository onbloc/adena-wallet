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

const StyledContainer = styled(View) <{ pressed: boolean; finish: boolean; }>`
  position: relative;
  overflow: hidden;
  display: flex;
  height: 32px;
  padding: 8px 16px;
  justify-content: center;
  align-items: center;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  user-select:none;
  box-shadow: 0 0 0 1px #212429 inset;

  ${({ pressed, finish }): FlattenSimpleInterpolation => (pressed || finish) ? css`
    box-shadow: 0 0 0 1px #1E3C71 inset, 0px 2px 16px 4px rgba(0, 89, 255, 0.24), 0px 1px 3px 0px rgba(0, 0, 0, 0.10), 0px 1px 2px 0px rgba(0, 0, 0, 0.06);
    background: ${finish ? '#0059ff52' : 'transparent'};
    ::before {
      content: '';
      z-index: -1;
      position: absolute;
      top: 0px;
      left: 0px;
      height: 100%;
      background: ${finish ? 'transparent' : '#0059ff52'};
      border-radius: 8px;
      animation: ${fill} 3s forwards; 
      box-shadow: ${finish ? 'none' : '0 0 0 1px #1E3C71 inset'};
    }
  `: css`
    :hover {
      background: #ffffff14;
      box-shadow: 0 0 0 1px #ffffff14 inset;
    }
  `}
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
  const [finish, setFinish] = useState(false);

  const endEvent = useCallback((): void => {
    setMouseover(false);
    if (pressed) {
      setPressed(false);
    }
  }, [pressed]);

  const onMouseDown = useCallback(() => {
    if (finish) {
      setFinish(false);
      return;
    }
    setMouseover(true);
    setPressed(true);
  }, [finish, endEvent]);

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
    onFinishHold(finish);
  }, [finish]);

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
  }, [pressed, onFinishHold]);

  return (
    <StyledContainer
      style={{
        width,
        height,
      }}
      pressed={pressed}
      finish={finish}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseOver={onMouseOver}
      onMouseLeave={onMouseLeave}
      onMouseOut={onMouseLeave}
    >
      <WebText
        color={(mouseover || finish) ? theme.webNeutral._100 : theme.webNeutral._500}
        type='title6'
        style={{ height: 14 }}
      >
        {text}
      </WebText>
    </StyledContainer>
  );
};
