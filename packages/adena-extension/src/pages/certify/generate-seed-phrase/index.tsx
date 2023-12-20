import React from 'react';
import styled, { CSSProp } from 'styled-components';
import { useNavigate } from 'react-router-dom';

import addSymbol from '@assets/add-symbol.svg';
import { Text, Button, ButtonHierarchy } from '@components/atoms';
import theme from '@styles/theme';
import { RoutePath } from '@router/path';

const content =
  'To add new accounts, you need to generate a seed phrase as you created your existing accounts with Google or Ledger, which didn’t require seed phrase generation.';

export const GenerateSeedPhrase = (): JSX.Element => {
  const navigate = useNavigate();

  const onclick = (): void => {
    navigate(RoutePath.YourSeedPhrase, { state: { type: 'ADD_ACCOUNT' } });
  };

  return (
    <Wrapper>
      <img src={addSymbol} alt='plus icon image' />
      <Text type='header4' margin='23px 0px 12px'>
        Generate Seed Phrase
      </Text>
      <Text type='body1Reg' color={theme.color.neutral[9]} textAlign='center'>
        {content}
      </Text>
      <Button fullWidth hierarchy={ButtonHierarchy.Primary} onClick={onclick} margin='auto 0px 0px'>
        <Text type='body1Bold'>Next</Text>
      </Button>
    </Wrapper>
  );
};

const Wrapper = styled.main`
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'center', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 56px;
  overflow-y: auto;
`;
