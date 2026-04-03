import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { describe, it } from 'vitest';

import ApproveAddingNetworkTable, { ApproveAddingNetworkTableProps } from './approve-adding-network-table';

describe('ApproveAddingNetworkTable Component', () => {
  it('ApproveAddingNetworkTable render', () => {
    const args: ApproveAddingNetworkTableProps = {
      name: '',
      rpcUrl: '',
      chainId: ''
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <ApproveAddingNetworkTable {...args} />
        </ThemeProvider>
      </RecoilRoot>
    );
  });
});
