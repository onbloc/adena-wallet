import { render, screen } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import theme from '@styles/theme';
import { TokenPrice } from '@types';

import FeeAmountUSD, { FeeAmountUSDProps } from './fee-amount-usd';

const GNOT_PRICE: TokenPrice = {
  tokenId: 'ugnot',
  networkId: 'gnoland-1',
  usd: 12.5,
  change24h: null,
};

function renderFeeAmountUSD(props: FeeAmountUSDProps): ReturnType<typeof render> {
  return render(
    <ThemeProvider theme={theme}>
      <FeeAmountUSD {...props} />
    </ThemeProvider>,
  );
}

describe('FeeAmountUSD Component', () => {
  it('restates the fee in USD', () => {
    renderFeeAmountUSD({ value: '0.4', price: GNOT_PRICE });

    expect(screen.getByText('$5.00')).not.toBeNull();
  });

  it('strips the separators a formatted amount carries', () => {
    renderFeeAmountUSD({ value: '1,000.000000', price: GNOT_PRICE });

    expect(screen.getByText('$12,500.00')).not.toBeNull();
  });

  it('reads "<$0.01" for a fee too small to write', () => {
    renderFeeAmountUSD({ value: '0.000048', price: GNOT_PRICE });

    expect(screen.getByText('<$0.01')).not.toBeNull();
  });

  it('signs the figure when the deposit is being released', () => {
    renderFeeAmountUSD({ value: '0.4', price: GNOT_PRICE, withSign: true });

    expect(screen.getByText('+$5.00')).not.toBeNull();
  });

  // An unquoted network must keep the single-line row it has today rather than
  // gaining a placeholder.
  it('renders nothing without a quote, for a zero fee, or for an empty one', () => {
    const { container: unquoted } = renderFeeAmountUSD({ value: '0.4', price: undefined });
    const { container: zero } = renderFeeAmountUSD({ value: '0', price: GNOT_PRICE });
    const { container: empty } = renderFeeAmountUSD({ value: '', price: GNOT_PRICE });

    expect(unquoted.firstChild).toBeNull();
    expect(zero.firstChild).toBeNull();
    expect(empty.firstChild).toBeNull();
  });
});
