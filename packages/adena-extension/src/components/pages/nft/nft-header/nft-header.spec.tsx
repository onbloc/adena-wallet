import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import NFTHeader, { NFTHeaderProps } from './nft-header';

describe('NFTHeader Component', () => {
  it('NFTHeader render', () => {
    const args: NFTHeaderProps = {
      moveDepositPage: () => {
        return;
      },
      openGnoscan: () => {
        return;
      },
    };

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <NFTHeader {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
