import React, { useCallback, useEffect, useState } from 'react';
import styled, { useTheme } from 'styled-components';

import { getTheme } from '@styles/theme';
import { Text, Button } from '@components/atoms';
import mixins from '@styles/mixins';

const CopyButton = styled(Button)<{ isClicked: boolean }>`
  ${mixins.flex({ direction: 'row' })};
  height: 25px;
  border-radius: 12.5px;
  padding: 0px 12px;
  transition: background-color 0.4s ease;
  &:hover {
    background-color: ${getTheme('neutral', 'b')};
  }
`;

export const Copy = ({
  copyStr,
  tabIndex,
}: {
  copyStr: string;
  tabIndex?: number;
}): JSX.Element => {
  const [isClicked, setIsClicked] = useState<boolean>(false);

  const theme = useTheme();
  const handleButtonClick = useCallback(() => {
    setIsClicked((prev: boolean) => !prev);
    navigator.clipboard.writeText(copyStr);
  }, [isClicked, copyStr]);

  useEffect(() => {
    const timer = setTimeout(() => setIsClicked(false), 2000);
    return () => {
      clearTimeout(timer);
    };
  }, [isClicked]);

  return (
    <CopyButton
      isClicked={isClicked}
      onClick={handleButtonClick}
      disabled={isClicked}
      tabIndex={tabIndex && tabIndex}
      bgColor={theme.neutral._7}
    >
      <Text type='body2Reg'>{isClicked ? 'Copied!' : 'Copy'}</Text>
    </CopyButton>
  );
};
