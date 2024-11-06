import React from 'react';
import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
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
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <NFTCollectionHeader {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
