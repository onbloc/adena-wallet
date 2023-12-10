import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import ApproveChangingNetwork, { ApproveChangingNetworkProps } from './approve-changing-network';

describe('ApproveChangingNetwork Component', () => {
  it('ApproveChangingNetwork render', () => {
    const args: ApproveChangingNetworkProps = {
      fromChain: {
        name: 'Testnet3',
      },
      toChain: {
        name: 'Onbloc Testnet',
      },
      changeable: true,
      processing: false,
      done: false,
      changeNetwork: () => {
        return;
      },
      cancel: () => {
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
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <ApproveChangingNetwork {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
