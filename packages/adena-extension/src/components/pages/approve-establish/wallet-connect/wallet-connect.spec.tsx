import React from 'react';
import { Provider as JotaiProvider } from 'jotai';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import WalletConnect, { WalletConnectProps } from './wallet-connect';

describe('WalletConnect Component', () => {
  it('WalletConnect render', () => {
    const args: WalletConnectProps = {
      domain: '',
      loading: true,
      logo: '',
      app: '',
      processing: false,
      done: false,
      onClickConnect: () => {
        return;
      },
      onClickCancel: () => {
        return;
      },
      onResponse: () => {
        return;
      },
      onTimeout: () => {
        return;
      },
    };

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <WalletConnect {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
