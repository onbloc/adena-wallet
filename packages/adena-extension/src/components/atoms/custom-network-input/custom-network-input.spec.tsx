import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import { CustomNetworkInputProps, CustomNetworkInput } from '.';

describe('CustomNetworkInput Component', () => {
  it('CustomNetworkInput render', () => {
    const args: CustomNetworkInputProps = {
      name: '',
      rpcUrl: '',
      rpcUrlError: '',
      chainId: '',
      indexerUrl: '',
      changeIndexerUrl: () => {
        return;
      },
      changeName: () => {
        return;
      },
      changeRPCUrl: () => {
        return;
      },
      changeChainId: () => {
        return;
      },
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <CustomNetworkInput {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
