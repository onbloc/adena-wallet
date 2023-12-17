import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import AdditionalTokenInfo, { AdditionalTokenInfoProps } from './additional-token-info';

describe('AdditionalTokenInfo Component', () => {
  it('AdditionalTokenInfo render', () => {
    const args: AdditionalTokenInfoProps = {
      symbol: 'GNOT',
      path: 'gno.land/gnot',
      decimals: '6',
    };

    render(
      <RecoilRoot>
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <AdditionalTokenInfo {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});