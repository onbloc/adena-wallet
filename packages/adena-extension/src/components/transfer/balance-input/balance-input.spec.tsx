import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import BalanceInput, { BalanceInputProps } from './balance-input';

describe('BalanceInput Component', () => {
  it('BalanceInput render', () => {
    const args: BalanceInputProps = {
      hasError: false,
      amount: '132123123123',
      denom: 'GNOT',
      description: 'Insufficient balance',
      onChangeAmount: () => { return; },
      onClickMax: () => { return; },
    };

    render(
      <RecoilRoot>
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <BalanceInput {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});