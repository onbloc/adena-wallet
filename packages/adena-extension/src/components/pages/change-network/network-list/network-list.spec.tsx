import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import NetworkList, { NetworkListProps } from './network-list';

describe('NetworkList Component', () => {
  it('NetworkList render', () => {
    const args: NetworkListProps = {
      currentNetworkId: 'test3',
      networkMetainfos: [],
      changeNetwork: () => {
        return;
      },
      moveEditPage: () => {
        return;
      },
    };

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <NetworkList {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
