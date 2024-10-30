import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import NFTCardImage, { NFTCardImageProps } from './nft-card-image';

describe('NFTCardImage Component', () => {
  it('NFTCardImage render', () => {
    const args: NFTCardImageProps = {
      image: '',
      isFetched: false,
      hasBadge: false,
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <NFTCardImage {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
