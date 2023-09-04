import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import AccountDetails, { AccountDetailsProps } from './account-details';

describe('AccountDetails Component', () => {
  it('AccountDetails render', () => {
    const args: AccountDetailsProps = {
      originName: '',
      name: '',
      address: '',
      moveGnoscan: () => { return; },
      moveExportPrivateKey: () => { return; },
      setName: () => { return; },
      reset: () => { return; },
    };

    render(
      <RecoilRoot>
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <AccountDetails {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});