import {
  describe, it,
} from 'vitest';
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

import TransferSummaryBalance, {
  TransferSummaryBalanceProps,
} from './transfer-summary-balance';

describe('TransferSummaryBalance Component', () => {
  it('TransferSummaryBalance render', () => {
    const args: TransferSummaryBalanceProps = {
      tokenImage: '',
      value: '',
      denom: '',
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <TransferSummaryBalance {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
