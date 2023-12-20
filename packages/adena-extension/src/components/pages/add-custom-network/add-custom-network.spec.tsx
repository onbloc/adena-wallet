import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import AddCustomNetwork, { AddCustomNetworkProps } from '.';

describe('AddCustomNetwork Component', () => {
  it('AddCustomNetwork render', () => {
    const args: AddCustomNetworkProps = {
      name: '',
      rpcUrl: '',
      rpcUrlError: '',
      chainId: '',
      changeName: () => {
        return;
      },
      changeRPCUrl: () => {
        return;
      },
      changeChainId: () => {
        return;
      },
      save: () => {
        return;
      },
      cancel: () => {
        return;
      },
      moveBack: () => {
        return;
      },
    };

    render(
      <RecoilRoot>
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <AddCustomNetwork {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
