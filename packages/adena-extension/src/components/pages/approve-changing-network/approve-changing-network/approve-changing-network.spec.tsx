import React from 'react';
import { Provider as JotaiProvider } from 'jotai';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import ApproveChangingNetwork, { ApproveChangingNetworkProps } from './approve-changing-network';

describe('ApproveChangingNetwork Component', () => {
  it('ApproveChangingNetwork render', () => {
    const args: ApproveChangingNetworkProps = {
      fromChain: {
        name: 'Testnet3',
      },
      toChain: {
        name: 'Onbloc Testnet',
      },
      changeable: true,
      processing: false,
      done: false,
      changeNetwork: () => {
        return;
      },
      cancel: () => {
        return;
      },
      onResponse: () => {
        return;
      },
      onTimeout: () => {
        return;
      },
    };

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <ApproveChangingNetwork {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
