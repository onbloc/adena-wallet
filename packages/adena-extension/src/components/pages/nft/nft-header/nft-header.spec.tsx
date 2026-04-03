import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { describe, it } from 'vitest';

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
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <NFTHeader {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
