import React from 'react';
import { Provider as JotaiProvider } from 'jotai';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
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
