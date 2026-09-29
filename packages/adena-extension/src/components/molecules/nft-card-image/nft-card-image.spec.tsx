import React from 'react';
import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { fireEvent, render, screen } from '@testing-library/react';
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

  it('retries a new image after an earlier one failed to load', () => {
    const renderImage = (image: string): JSX.Element => (
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <NFTCardImage isFetched image={image} />
        </ThemeProvider>
      </RecoilRoot>
    );

    const { rerender } = render(renderImage('https://example.test/broken.png'));
    fireEvent.error(screen.getByAltText('nft image'));
    expect(screen.getByAltText('empty image')).toBeTruthy();

    rerender(renderImage('https://example.test/working.png'));

    expect(screen.getByAltText('nft image').getAttribute('src')).toBe(
      'https://example.test/working.png',
    );
  });
});
