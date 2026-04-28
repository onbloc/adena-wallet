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
