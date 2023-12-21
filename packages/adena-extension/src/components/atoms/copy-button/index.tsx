import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

import theme from '@styles/theme';
import { Text, Button } from '@components/atoms';
import mixins from '@styles/mixins';

const CopyButton = styled(Button)<{ isClicked: boolean }>`
  ${mixins.flex('row', 'center', 'center')};
  height: 25px;
  border-radius: 12.5px;
  padding: 0px 12px;
  transition: background-color 0.4s ease;
  &:hover {
    background-color: ${theme.color.neutral[11]};
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
      bgColor={theme.color.neutral[6]}
    >
      <Text type='body2Reg'>{isClicked ? 'Copied!' : 'Copy'}</Text>
    </CopyButton>
  );
};
