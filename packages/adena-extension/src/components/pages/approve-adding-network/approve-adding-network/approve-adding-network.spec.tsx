import React from 'react';
import { Provider as JotaiProvider } from 'jotai';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import ApproveAddingNetwork, { ApproveAddingNetworkProps } from './approve-adding-network';

describe('ApproveAddingNetwork Component', () => {
  it('ApproveAddingNetwork render', () => {
    const args: ApproveAddingNetworkProps = {
      networkInfo: {
        name: '',
        rpcUrl: '',
        chainId: '',
      },
      logo: '',
      approvable: true,
      processing: false,
      done: false,
      approve: () => {
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
          <ApproveAddingNetwork {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
