import React from 'react';
import styled, { useTheme } from 'styled-components';

import addSymbol from '@assets/add-symbol.svg';
import { Text, Button } from '@components/atoms';
import { RoutePath } from '@router/path';
import mixins from '@styles/mixins';
import useAppNavigate from '@hooks/use-app-navigation';

const content =
  'To add new accounts, you need to generate a seed phrase as you created your existing accounts with Google or Ledger, which didn’t require seed phrase generation.';

export const GenerateSeedPhrase = (): JSX.Element => {
  const theme = useTheme();
  const { navigate } = useAppNavigate();

  const onclick = (): void => {
    navigate(RoutePath.YourSeedPhrase, { state: { type: 'ADD_ACCOUNT' } });
  };

  return (
    <Wrapper>
      <img src={addSymbol} alt='plus icon image' />
      <Text type='header4' margin='23px 0px 12px'>
        Generate Seed Phrase
      </Text>
      <Text type='body1Reg' color={theme.neutral.a} textAlign='center'>
        {content}
      </Text>
      <Button fullWidth onClick={onclick} margin='auto 0px 0px'>
        <Text type='body1Bold'>Next</Text>
      </Button>
    </Wrapper>
  );
};

const Wrapper = styled.main`
  ${mixins.flex({ justify: 'flex-start' })};
  width: 100%;
  height: 100%;
  padding-top: 56px;
  overflow-y: auto;
`;
