import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import CustomNetworkInput, { CustomNetworkInputProps } from './custom-network-input';

describe('CustomNetworkInput Component', () => {
  it('CustomNetworkInput render', () => {
    const args: CustomNetworkInputProps = {
      name: '',
      rpcUrl: '',
      rpcUrlError: '',
      chainId: '',
      changeName: () => { return; },
      changeRPCUrl: () => { return; },
      changeChainId: () => { return; },
    };

    render(
      <RecoilRoot>
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <CustomNetworkInput {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});