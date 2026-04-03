import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { describe, it } from 'vitest';

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
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <WalletConnect {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
