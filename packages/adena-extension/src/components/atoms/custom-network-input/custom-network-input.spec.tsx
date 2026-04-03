import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { describe, it } from 'vitest';

import { CustomNetworkInput, CustomNetworkInputProps } from '.';

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
      }
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <CustomNetworkInput {...args} />
        </ThemeProvider>
      </RecoilRoot>
    );
  });
});
