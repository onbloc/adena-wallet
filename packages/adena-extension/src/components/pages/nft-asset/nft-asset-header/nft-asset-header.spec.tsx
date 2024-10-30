import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
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
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <NFTAssetHeader {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
