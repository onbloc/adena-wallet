import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import EditNetwork, { EditNetworkProps } from '.';

describe('EditNetwork Component', () => {
  it('EditNetwork render', () => {
    const args: EditNetworkProps = {
      chainGroup: 'gno',
      name: '',
      rpcUrl: '',
      chainId: '',
      rpcUrlError: '',
      extraUrl: '',
      extraUrlError: '',
      savable: true,
      isDefault: false,
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
      clearNetwork: () => {
        return;
      },
      saveNetwork: () => {
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
          <EditNetwork {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
