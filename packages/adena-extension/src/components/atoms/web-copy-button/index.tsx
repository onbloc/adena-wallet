import React, { CSSProperties, useCallback, useEffect, useMemo, useState } from 'react';
import styled, { css, RuleSet, useTheme } from 'styled-components';

import IconCopy from '@assets/web/icon-copy';
import { Row, View } from '../base';
import { WebText } from '../web-text';

interface WebCopyButtonProps {
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
  copyText: string;
  clearClipboardTimeout?: number;
  onCopy?: () => void;
}

const StyledContainer = styled(Row)<{ clicked: boolean }>`
  display: flex;
  padding: 0 14px 0 14px;
  gap: 4px;
  justify-content: center;
  align-items: center;
  border-radius: 8px;
  border: 1px solid #212429;
  background: transparent;
  cursor: pointer;
  user-select: none;

  svg {
    width: 16px;
    height: 16px;
  }

  svg * {
    stroke: ${({ theme }): string => theme.webNeutral._500};
  }

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    svg * {
      stroke: ${({ theme }): string => theme.webNeutral._100};
    }
  }

  ${({ clicked }): RuleSet | string =>
    clicked
      ? css`
          background: rgba(255, 255, 255, 0.08);
        `
      : ''}
`;

const CLEAR_CLIPBOARD_TIMEOUT = 30_000; // 30 seconds
const COPY_TOOLTIP_DISPLAY_TIMEOUT = 2_000; // 2 seconds

export const WebCopyButton: React.FC<WebCopyButtonProps> = ({
  width = 'fit-content',
  height = 32,
  copyText,
  clearClipboardTimeout = CLEAR_CLIPBOARD_TIMEOUT,
  onCopy,
}) => {
  const theme = useTheme();
  const [clicked, setClicked] = useState(false);
  const [mouseover, setMouseover] = useState(false);

  const buttonStr = useMemo(() => {
    if (clicked) {
      return 'Copied!';
    }
    return 'Copy';
  }, [clicked]);

  const activated = useMemo(() => {
    return mouseover || clicked;
  }, [mouseover, clicked]);

  const onMouseDown = useCallback(() => {
    if (clicked) {
      return;
    }
    setClicked(true);

    navigator.clipboard.writeText(copyText);
    onCopy && onCopy();

    setTimeout(() => {
      setClicked(false);
    }, COPY_TOOLTIP_DISPLAY_TIMEOUT);
  }, [clicked, copyText, onCopy]);

  const onMouseOver = useCallback(() => {
    setMouseover(true);
  }, []);

  const onMouseLeave = useCallback(() => {
    setMouseover(false);
  }, []);

  useEffect(() => {
    if (!clicked) {
      return;
    }

    const timeout = setTimeout(() => {
      navigator?.clipboard?.writeText('');
    }, clearClipboardTimeout);

    return () => {
      clearTimeout(timeout);
    };
  }, [clicked, clearClipboardTimeout]);

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
        <WebText color={activated ? theme.webNeutral._100 : theme.webNeutral._500} type='body6'>
          {buttonStr}
        </WebText>
      ) : (
        <React.Fragment>
          <View>
            <IconCopy />
          </View>
          <WebText color={activated ? theme.webNeutral._100 : theme.webNeutral._500} type='title6'>
            {buttonStr}
          </WebText>
        </React.Fragment>
      )}
    </StyledContainer>
  );
};
