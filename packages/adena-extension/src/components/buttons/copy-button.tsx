import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import Text from '../text';

const Button = styled.button<{ isClicked: boolean }>`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'center')};
  width: fit-content;
  height: 25px;
  background-color: ${(props) =>
    props.isClicked ? props.theme.color.primary[4] : props.theme.color.primary[3]};
  border-radius: 24px;
  padding: 0px 12px;
  transition: background-color 0.4s ease;
`;

const Copy = ({ seeds, tabIndex }: { seeds: string; tabIndex?: number }) => {
  const [isClicked, setIsClicked] = useState<boolean>(false);

  const handleButtonClick = useCallback(() => {
    setIsClicked((prev: boolean) => !prev);
    navigator.clipboard.writeText(seeds);
  }, [isClicked, seeds]);

  useEffect(() => {
    const timer = setTimeout(() => setIsClicked(false), 2000);
    return () => {
      clearTimeout(timer);
    };
  }, [isClicked]);

  return (
    <Button
      isClicked={isClicked}
      onClick={handleButtonClick}
      disabled={isClicked}
      tabIndex={tabIndex && tabIndex}
    >
      <Text type='body2Reg'>{isClicked ? 'Copied!' : 'Copy'}</Text>
    </Button>
  );
};

export default Copy;
