import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { Text } from '@components/atoms';
import mixins from '@styles/mixins';
import theme, { fonts } from '@styles/theme';

interface CopyTooltipProps {
  children: React.ReactNode;
  copyText: string;
  position?: 'top' | 'bottom';
  className?: string;
}

const ToolTipInner = styled.div`
  ${mixins.flex('row', 'center', 'center')};
  ${fonts.body2Reg};
  position: absolute;
  width: max-content;
  height: 25px;
  visibility: hidden;
  z-index: 1;
  padding: 0px 17px;
  background-color: ${theme.color.neutral[8]};
  border-radius: 13px;
  transform: scale(0.6);
  cursor: default;

  &.top {
    top: -27px;
  }

  &.bottom {
    bottom: -27px;
  }
`;

const ToolTipWrap = styled.div`
  ${mixins.flex('row', 'center', 'center')};
  position: relative;
  cursor: pointer;
  &:hover .tooltip,
  &.isClicked .tooltip {
    transition: all 0.1s ease-in-out;
    visibility: visible;
    transform: scale(1);
  }
`;

export const CopyTooltip = ({
  children,
  copyText,
  className,
  position = 'bottom',
}: CopyTooltipProps): JSX.Element => {
  const [isClicked, setIsClicked] = useState<boolean>(false);

  const handleButtonClick = useCallback(() => {
    setIsClicked(true);
    navigator.clipboard.writeText(copyText);
  }, [isClicked, copyText]);

  useEffect(() => {
    const timer = setTimeout(() => setIsClicked(false), 2000);
    return () => {
      clearTimeout(timer);
    };
  }, [isClicked]);

  return (
    <ToolTipWrap className={isClicked ? `${className} isClicked` : className}>
      <div onClick={handleButtonClick}>{children}</div>
      <ToolTipInner className={`tooltip ${position}`}>
        <Text type='body3Reg'>{isClicked ? 'Copied!' : 'Copy to clipboard'}</Text>
      </ToolTipInner>
    </ToolTipWrap>
  );
};
