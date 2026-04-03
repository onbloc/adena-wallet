import {
  GlobalPopupStyle,
} from '@styles/global-style';
import theme from '@styles/theme';
import {
  render,
} from '@testing-library/react';
import React from 'react';
import {
  RecoilRoot,
} from 'recoil';
import {
  ThemeProvider,
} from 'styled-components';
import {
  describe, it,
} from 'vitest';

import TokenListItemBalance, {
  TokenListItemBalanceProps,
} from './token-list-item-balance';

describe('TokenListItemBalance Component', () => {
  it('TokenListItemBalance render', () => {
    const args: TokenListItemBalanceProps = {
      amount: {
        value: '240,255.241155',
        denom: 'GNOT',
      },
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <TokenListItemBalance {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
