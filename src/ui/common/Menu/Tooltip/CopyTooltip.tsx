import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import Typography, { textVariants } from '@ui/common/Typography';

interface CopyTooltipProps {
  children: React.ReactNode;
  copyText: string;
}

const ToolTipInner = styled.div<{ isClicked: boolean }>`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'center')};
  ${textVariants.body2Reg};
  position: absolute;
  bottom: -27px;
  width: max-content;
  height: 25px;
  visibility: hidden;
  z-index: 1;
  padding: 0px 17px;
  background-color: ${(props) =>
    props.isClicked ? props.theme.color.primary[4] : props.theme.color.primary[3]};
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

export const CopyTooltip = ({ children, copyText }: CopyTooltipProps) => {
  const [isClicked, setIsClicked] = useState<boolean>(false);

  const handleButtonClick = useCallback(
    (e) => {
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
    <ToolTipWrap className={isClicked ? 'isClicked' : ''}>
      <div onClick={handleButtonClick}>{children}</div>
      <ToolTipInner className='tooltip' isClicked={isClicked}>
        <Typography type='body2Reg'>{isClicked ? 'Copied!' : 'Copy to clipboard'}</Typography>
      </ToolTipInner>
    </ToolTipWrap>
  );
};
