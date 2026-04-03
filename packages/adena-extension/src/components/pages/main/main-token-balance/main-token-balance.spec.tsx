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

import MainTokenBalance, {
  MainTokenBalanceProps,
} from './main-token-balance';

describe('MainTokenBalance Component', () => {
  it('MainTokenBalance render', () => {
    const args: MainTokenBalanceProps = {
      amount: {
        value: '240,255.241155',
        denom: 'GNOT',
      },
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <MainTokenBalance {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
