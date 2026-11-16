import React from 'react';
import { Provider as JotaiProvider } from 'jotai';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import AddCustomNetwork, { AddCustomNetworkProps } from '.';

describe('AddCustomNetwork Component', () => {
  it('AddCustomNetwork render', () => {
    const args: AddCustomNetworkProps = {
      chainGroup: 'gno',
      name: '',
      rpcUrl: '',
      rpcUrlError: '',
      extraUrl: '',
      extraUrlError: '',
      chainId: '',
      changeName: () => {
        return;
      },
      changeRPCUrl: () => {
        return;
      },
      changeExtraUrl: () => {
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
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <AddCustomNetwork {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
