import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import NFTCollectionHeader, { NFTCollectionHeaderProps } from './nft-collection-header';

describe('NFTCollectionHeader Component', () => {
  it('NFTCollectionHeader render', () => {
    const args: NFTCollectionHeaderProps = {
      moveBack: () => {
        return;
      },
      openGnoscanCollection: () => {
        return;
      },
      title: '',
    };

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <NFTCollectionHeader {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
