import { render, screen } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import { FeeTokenQuote } from '@hooks/wallet/use-fee-token-price';
import theme from '@styles/theme';

import FeeAmount, { FeeAmountProps } from './fee-amount';

const GNOT_QUOTE: FeeTokenQuote = {
  price: {
    tokenId: 'ugnot',
    networkId: 'gnoland-1',
    usd: 12.5,
    change24h: null,
  },
  isLoading: false,
};

const UNQUOTED: FeeTokenQuote = { price: undefined, isLoading: false };
const PENDING_QUOTE: FeeTokenQuote = { price: undefined, isLoading: true };

function renderFeeAmount(props: FeeAmountProps): ReturnType<typeof render> {
  return render(
    <ThemeProvider theme={theme}>
      <FeeAmount {...props} />
    </ThemeProvider>,
  );
}

describe('FeeAmount Component', () => {
  describe('with a quote', () => {
    it('shows the token amount followed by its USD value in parentheses', () => {
      renderFeeAmount({ value: '0.4', denom: 'GNOT', quote: GNOT_QUOTE });

      expect(screen.getByText('GNOT')).not.toBeNull();
      expect(screen.getByText('($5.00)')).not.toBeNull();
    });

    it('strips the separators a formatted amount carries', () => {
      renderFeeAmount({ value: '1,000.000000', denom: 'GNOT', quote: GNOT_QUOTE });

      expect(screen.getByText('($12,500.00)')).not.toBeNull();
    });

    // 0.000048 GNOT at $12.50 is $0.0006.
    it('reads a fee below $0.001 as "<$0.001"', () => {
      renderFeeAmount({ value: '0.000048', denom: 'GNOT', quote: GNOT_QUOTE });

      expect(screen.getByText('GNOT')).not.toBeNull();
      expect(screen.getByText('(<$0.001)')).not.toBeNull();
    });

    it('signs the figure when the deposit is being released', () => {
      renderFeeAmount({ value: '0.4', denom: 'GNOT', quote: GNOT_QUOTE, withSign: true });

      expect(screen.getByText('(+$5.00)')).not.toBeNull();
    });
  });

  // Adding the USD value a moment after the amount would shift the row.
  describe('while the quote is still on its way', () => {
    it('waits instead of showing the amount alone', () => {
      const { container } = renderFeeAmount({
        value: '0.004800',
        denom: 'GNOT',
        quote: PENDING_QUOTE,
      });

      expect(screen.queryByText('GNOT')).toBeNull();
      expect(container.firstChild).not.toBeNull();
    });

    it('does not wait once there is a price to show', () => {
      renderFeeAmount({
        value: '0.4',
        denom: 'GNOT',
        quote: { ...GNOT_QUOTE, isLoading: true },
      });

      expect(screen.getByText('($5.00)')).not.toBeNull();
    });
  });

  describe('without an honest USD figure', () => {
    // Testnets carry no quote by design, and the token amount is then the only
    // thing there is to say.
    it('falls back to the token amount when the token is unquoted', () => {
      renderFeeAmount({ value: '0.004800', denom: 'GNOT', quote: UNQUOTED });

      expect(screen.getByText('GNOT')).not.toBeNull();
      expect(screen.queryByText(/\$/)).toBeNull();
    });

    it('keeps the token amount for a zero fee', () => {
      renderFeeAmount({ value: '0', denom: 'GNOT', quote: GNOT_QUOTE });

      expect(screen.getByText('GNOT')).not.toBeNull();
      expect(screen.queryByText(/\$/)).toBeNull();
    });

    it('keeps the token amount when the figure is unreadable', () => {
      renderFeeAmount({ value: '', denom: 'GNOT', quote: GNOT_QUOTE });

      expect(screen.getByText('GNOT')).not.toBeNull();
    });
  });
});
