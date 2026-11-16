import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import AdditionalTokenInfo, { AdditionalTokenInfoProps } from './additional-token-info';

describe('AdditionalTokenInfo Component', () => {
  it('AdditionalTokenInfo render', () => {
    const args: AdditionalTokenInfoProps = {
      isLoading: false,
      symbol: 'GNOT',
      path: 'gno.land/gnot',
      decimals: '6',
    };

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <AdditionalTokenInfo {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
