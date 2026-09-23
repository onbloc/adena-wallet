import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render, screen } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import TokenListItemBalance, { TokenListItemBalanceProps } from './token-list-item-balance';

function renderBalance(props: TokenListItemBalanceProps): ReturnType<typeof render> {
  return render(
    <RecoilRoot>
      <GlobalPopupStyle />
      <ThemeProvider theme={theme}>
        <TokenListItemBalance {...props} />
      </ThemeProvider>
    </RecoilRoot>,
  );
}

describe('TokenListItemBalance Component', () => {
  it('renders amount when loaded', () => {
    renderBalance({
      amount: { value: '240,255.241155', denom: 'GNOT' },
    });
  });

  it('renders skeleton when loading', () => {
    renderBalance({
      amount: { value: '', denom: '' },
      loading: true,
    });

    expect(screen.getByLabelText('Loading balance')).not.toBeNull();
  });

  it('renders warning icon when error', () => {
    renderBalance({
      amount: { value: '', denom: '' },
      error: true,
    });

    expect(screen.getByLabelText('Failed to load balance')).not.toBeNull();
  });

  it('leads with the USD value and demotes the balance when quoted', () => {
    renderBalance({
      amount: { value: '640,315.512321', denom: 'PHOTON' },
      usdDisplay: true,
      tokenValue: { usdValue: 2120252.239, change24h: 3.29 },
    });

    expect(screen.getByText('$2,120,252.23')).not.toBeNull();
    expect(screen.getByText('640,315.512321 PHOTON')).not.toBeNull();
  });

  it('reads "-" in USD display mode when the token has no quote', () => {
    renderBalance({
      amount: { value: '640,315.512321', denom: 'PHOTON' },
      usdDisplay: true,
    });

    expect(screen.getByText('-')).not.toBeNull();
    expect(screen.getByText('640,315.512321 PHOTON')).not.toBeNull();
  });

  it('prefers error over loading when both flags are set', () => {
    renderBalance({
      amount: { value: '', denom: '' },
      loading: true,
      error: true,
    });

    expect(screen.getAllByLabelText('Failed to load balance').length).toBeGreaterThan(0);
    expect(screen.queryByLabelText('Loading balance')).toBeNull();
  });
});
