import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import Text from '@components/text';

interface CopyTooltipProps {
  children: React.ReactNode;
  copyText: string;
  className?: string;
}

const ToolTipInner = styled.div`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'center')};
  ${({ theme }) => theme.fonts.body2Reg};
  position: absolute;
  bottom: -27px;
  width: max-content;
  height: 25px;
  visibility: hidden;
  z-index: 1;
  padding: 0px 17px;
  background-color: ${({ theme }) => theme.color.neutral[8]};
  border-radius: 13px;
  transform: scale(0.6);
  cursor: default;
`;

const ToolTipWrap = styled.div`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'center')};
  position: relative;
  cursor: pointer;
  &:hover .tooltip,
  &.isClicked .tooltip {
    transition: all 0.1s ease-in-out;
    visibility: visible;
    transform: scale(1);
  }
`;

export const CopyTooltip = ({ children, copyText, className }: CopyTooltipProps) => {
  const [isClicked, setIsClicked] = useState<boolean>(false);

  const handleButtonClick = useCallback(
    () => {
      setIsClicked(true);
      navigator.clipboard.writeText(copyText);
    },
    [isClicked, copyText],
  );

  useEffect(() => {
    const timer = setTimeout(() => setIsClicked(false), 2000);
    return () => {
      clearTimeout(timer);
    };
  }, [isClicked]);

  return (
    <ToolTipWrap className={isClicked ? `${className} isClicked` : className}>
      <div onClick={handleButtonClick}>{children}</div>
      <ToolTipInner className='tooltip'>
        <Text type='body3Reg'>{isClicked ? 'Copied!' : 'Copy to clipboard'}</Text>
      </ToolTipInner>
    </ToolTipWrap>
  );
};
