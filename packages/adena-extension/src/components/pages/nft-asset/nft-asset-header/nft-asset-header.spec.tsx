import React from 'react';
import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import { ThemeProvider } from 'styled-components';
import NFTAssetHeader, { NFTAssetHeaderProps } from './nft-asset-header';

describe('NFTAssetHeader Component', () => {
  it('NFTAssetHeader render', () => {
    const args: NFTAssetHeaderProps = {
      title: '',
      pinned: true,
      visible: true,
      moveBack: () => {
        return;
      },
      openGnoscanCollection: () => {
        return;
      },
      pinCollection: () => {
        return;
      },
      unpinCollection: () => {
        return;
      },
      showCollection: () => {
        return;
      },
      hideCollection: () => {
        return;
      },
    };

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <NFTAssetHeader {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
