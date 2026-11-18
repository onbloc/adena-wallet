import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render, screen } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import BalanceInput, { BalanceInputProps } from './balance-input';

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
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <BalanceInput {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });

  const renderWith = (props: Partial<BalanceInputProps>): void => {
    render(
      <ThemeProvider theme={theme}>
        <BalanceInput
          hasError={false}
          amount=''
          denom='GNOT'
          description='Spendable: 10 GNOT'
          onChangeAmount={vi.fn()}
          onClickMax={vi.fn()}
          {...props}
        />
      </ThemeProvider>,
    );
  };

  it('shows the USD value beside the description when the token is quoted', () => {
    renderWith({ usdValue: '$0.00' });

    expect(screen.getByText('$0.00')).not.toBeNull();
    expect(screen.getByText('Spendable: 10 GNOT')).not.toBeNull();
  });

  it('shows only the description when the token is unquoted', () => {
    renderWith({ usdValue: null });

    expect(screen.queryByText(/\$/)).toBeNull();
    expect(screen.getByText('Spendable: 10 GNOT')).not.toBeNull();
  });
});
