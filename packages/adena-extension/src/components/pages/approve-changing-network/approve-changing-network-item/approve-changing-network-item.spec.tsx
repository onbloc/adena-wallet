import React from 'react';
import { Provider as JotaiProvider } from 'jotai';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import ApproveChangingNetworkItem, {
  ApproveChangingNetworkItemProps,
} from './approve-changing-network-item';

describe('ApproveChangingNetworkItem Component', () => {
  it('ApproveChangingNetworkItem render', () => {
    const args: ApproveChangingNetworkItemProps = {
      name: 'Testnet3',
    };

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <ApproveChangingNetworkItem {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
