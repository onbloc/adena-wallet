import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render, screen } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
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
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <BalanceInput {...args} />
        </ThemeProvider>
      </RecoilRoot>,
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
          onChangeAmount={jest.fn()}
          onClickMax={jest.fn()}
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
