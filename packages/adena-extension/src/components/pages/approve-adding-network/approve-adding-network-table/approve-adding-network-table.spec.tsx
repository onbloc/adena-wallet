import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import ApproveAddingNetworkTable, {
  ApproveAddingNetworkTableProps,
} from './approve-adding-network-table';

describe('ApproveAddingNetworkTable Component', () => {
  it('ApproveAddingNetworkTable render', () => {
    const args: ApproveAddingNetworkTableProps = {
      name: '',
      rpcUrl: '',
      chainId: '',
    };

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <ApproveAddingNetworkTable {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
