import React, { CSSProperties, useCallback, useMemo, useState } from 'react';
import styled, { css, FlattenSimpleInterpolation, useTheme } from 'styled-components';

import { WebText } from '../web-text';
import { Row, View } from '../base';
import IconCopy from '@assets/web/icon-copy';

interface WebCopyButtonProps {
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
  copyText: string;
}

const StyledContainer = styled(Row) <{ clicked: boolean }>`
  display: flex;
  padding: 0 14px 0 14px;
  gap: 4px;
  justify-content: center;
  align-items: center;
  border-radius: 8px;
  border: 1px solid #212429;
  background: transparent;
  cursor: pointer;
  user-select:none;

  svg {
    width: 16px;
    height: 16px;
  }

  svg * {
    stroke: ${({ theme }): string => theme.webNeutral._500};
  }

  :hover {
    background: rgba(255, 255, 255, 0.08);
    svg * {
      stroke: ${({ theme }): string => theme.webNeutral._100};
    }
  }

  ${({ clicked }): FlattenSimpleInterpolation | string => clicked ? css`
    background: rgba(255, 255, 255, 0.08);
  `: ''}
`;

export const WebCopyButton: React.FC<WebCopyButtonProps> = ({
  width = 'fit-content',
  height = 32,
  copyText,
}) => {
  const theme = useTheme();
  const [clicked, setClicked] = useState(false);
  const [mouseover, setMouseover] = useState(false);

  const buttonStr = useMemo(() => {
    if (clicked) {
      return 'Copied!';
    }
    return 'Copy';
  }, [clicked])

  const activated = useMemo(() => {
    return mouseover || clicked;
  }, [mouseover, clicked]);

  const onMouseDown = useCallback(() => {
    if (clicked) {
      return;
    }
    setClicked(true);
    navigator.clipboard.writeText(copyText);
    setTimeout(() => {
      setClicked(false);
    }, 2000);
  }, [clicked, copyText]);

  const onMouseOver = useCallback(() => {
    setMouseover(true);
  }, []);

  const onMouseLeave = useCallback(() => {
    setMouseover(false);
  }, []);

  return (
    <StyledContainer
      style={{
        width,
        height,
      }}
      clicked={clicked}
      onMouseDown={onMouseDown}
      onMouseOver={onMouseOver}
      onMouseLeave={onMouseLeave}
      onMouseOut={onMouseLeave}
    >
      {clicked ? (
        <WebText
          color={activated ? theme.webNeutral._100 : theme.webNeutral._500}
          type='body6'
          style={{ height: 14 }}
        >
          {buttonStr}
        </WebText>
      ) : (
        <React.Fragment>
          <View>
            <IconCopy />
          </View>
          <WebText
            color={activated ? theme.webNeutral._100 : theme.webNeutral._500}
            type='body6'
            style={{ height: 14 }}
          >
            {buttonStr}
          </WebText>
        </React.Fragment>
      )}
    </StyledContainer>
  );
}