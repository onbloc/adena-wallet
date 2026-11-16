import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import { CustomNetworkInput, CustomNetworkInputProps } from '.';

describe('CustomNetworkInput Component', () => {
  it('CustomNetworkInput render', () => {
    const args: CustomNetworkInputProps = {
      name: '',
      rpcUrl: '',
      rpcUrlError: '',
      chainId: '',
      extraUrl: '',
      fieldType: 'indexer',
      changeExtraUrl: () => {
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
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <CustomNetworkInput {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
