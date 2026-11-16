import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

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
