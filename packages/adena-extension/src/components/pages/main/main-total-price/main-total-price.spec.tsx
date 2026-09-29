import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render, screen } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import MainTotalPrice, { MainTotalPriceProps } from './main-total-price';

function renderTotalPrice(props: MainTotalPriceProps): ReturnType<typeof render> {
  return render(
    <RecoilRoot>
      <GlobalPopupStyle />
      <ThemeProvider theme={theme}>
        <MainTotalPrice {...props} />
      </ThemeProvider>
    </RecoilRoot>,
  );
}

describe('MainTotalPrice Component', () => {
  it('renders the total and its 24h delta', () => {
    renderTotalPrice({
      value: { totalUSDValue: 100278210.389, changeUSDValue: 125.02, changeRate: 15.25 },
    });

    // The measure clone duplicates the total, so both copies are expected.
    expect(screen.getAllByText('$100,278,210.38')).toHaveLength(2);
    expect(screen.getByText('+$125.02')).not.toBeNull();
    expect(screen.getByText('+15.25%')).not.toBeNull();
  });

  it('drops the sign on a flat portfolio', () => {
    renderTotalPrice({
      value: { totalUSDValue: 50, changeUSDValue: 0, changeRate: 0 },
    });

    expect(screen.getByText('$0.00')).not.toBeNull();
    expect(screen.getByText('0.00%')).not.toBeNull();
  });

  it('omits the delta row when no quoted token reports a change', () => {
    renderTotalPrice({
      value: { totalUSDValue: 50, changeUSDValue: null, changeRate: null },
    });

    expect(screen.getAllByText('$50.00')).toHaveLength(2);
    expect(screen.queryByText('0.00%')).toBeNull();
    expect(screen.queryByText('$0.00')).toBeNull();
  });

  it('withholds the total when a balance feeding it could not be refreshed', () => {
    renderTotalPrice({
      value: { totalUSDValue: 200, changeUSDValue: 10, changeRate: 5 },
      unavailable: true,
    });

    expect(screen.queryByText('$200.00')).toBeNull();
    expect(screen.queryByText('+$10.00')).toBeNull();
    expect(screen.queryByText('+5.00%')).toBeNull();
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });

  it('renders skeleton when loading', () => {
    renderTotalPrice({
      value: { totalUSDValue: 0, changeUSDValue: 0, changeRate: 0 },
      loading: true,
    });

    expect(screen.getByLabelText('Loading balance')).not.toBeNull();
  });
});
