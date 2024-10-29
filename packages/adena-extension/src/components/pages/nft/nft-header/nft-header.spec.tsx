import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import NFTHeader, { NFTHeaderProps } from './nft-header';

describe('NFTHeader Component', () => {
  it('NFTHeader render', () => {
    const args: NFTHeaderProps = {
      grc721Tokens: [],
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <NFTHeader {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
