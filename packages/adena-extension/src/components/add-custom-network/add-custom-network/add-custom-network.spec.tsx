import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import AddCustomNetwork, { AddCustomNetworkProps } from './add-custom-network';

describe('AddCustomNetwork Component', () => {
  it('AddCustomNetwork render', () => {
    const args: AddCustomNetworkProps = {
      name: '',
      rpcUrl: '',
      hasRPCUrlError: false,
      chainId: '',
      onChangeName: () => { return; },
      onChangeRPCUrl: () => { return; },
      onChangeChainId: () => { return; },
      save: () => { return; },
      cancel: () => { return; },
      moveBack: () => { return; },
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