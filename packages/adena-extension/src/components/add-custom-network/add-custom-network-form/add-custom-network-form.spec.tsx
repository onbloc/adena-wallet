import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import AddCustomNetworkForm, { AddCustomNetworkFormProps } from './add-custom-network-form';

describe('AddCustomNetworkForm Component', () => {
  it('AddCustomNetworkForm render', () => {
    const args: AddCustomNetworkFormProps = {
      name: '',
      rpcUrl: '',
      hasRPCUrlError: false,
      chainId: '',
      onChangeName: () => { return; },
      onChangeRPCUrl: () => { return; },
      onChangeChainId: () => { return; },
      save: () => { return; },
      cancel: () => { return; },
    };

    render(
      <RecoilRoot>
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <AddCustomNetworkForm {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});