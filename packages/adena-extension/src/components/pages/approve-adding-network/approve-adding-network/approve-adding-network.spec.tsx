import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

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
