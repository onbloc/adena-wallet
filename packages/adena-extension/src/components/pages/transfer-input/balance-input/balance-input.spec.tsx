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

import BalanceInput, {
  BalanceInputProps,
} from './balance-input';

describe('BalanceInput Component', () => {
  it('BalanceInput render', () => {
    const args: BalanceInputProps = {
      hasError: false,
      amount: '132123123123',
      denom: 'GNOT',
      description: 'Insufficient balance',
      onChangeAmount: () => {
        return;
      },
      onClickMax: () => {
        return;
      },
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <BalanceInput {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
