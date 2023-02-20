import React, { useCallback } from 'react';
import styled from 'styled-components';
import Button from './button';
import Text from '@components/text';
import theme from '@styles/theme';
import Copy from './copy-button';

interface SeedViewAndCopyProps {
  showBlurScreen: boolean;
  setShowBlurScreen: React.Dispatch<React.SetStateAction<boolean>>;
  copyStr: string;
}

const SeedViewAndCopy = ({ showBlurScreen, setShowBlurScreen, copyStr }: SeedViewAndCopyProps) => {
  const blurScreenHandler = useCallback(() => {
    setShowBlurScreen((prev: boolean) => !prev);
  }, [showBlurScreen]);

  return (
    <Wrapper>
      <ButtonStyle bgColor={theme.color.neutral[6]} onClick={blurScreenHandler}>
        <Text type='body2Reg'>{showBlurScreen ? 'View Seed Phrase' : 'Hide Seed Phrase'}</Text>
      </ButtonStyle>
      <Copy copyStr={copyStr} />
    </Wrapper>
  );
};

const Wrapper = styled.div`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'space-between')};
  width: 100%;
  margin: 12px auto auto;
  padding: 0px 45px;
`;

const ButtonStyle = styled(Button)`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'center')};
  height: 25px;
  border-radius: 12.5px;
  padding: 0px 12px;
  transition: background-color 0.4s ease;
  &:hover {
    background-color: ${({ theme }) => theme.color.neutral[11]};
  }
`;

export default SeedViewAndCopy;
