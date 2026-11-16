import theme from '@styles/theme';
import { render, screen } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import type { JSX } from 'react';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import StorageDeposit, { StorageDepositProps } from './storage-deposit';

// Prints the amount the row hands to FeeAmount, sign included.
vi.mock('@components/molecules/fee-amount/fee-amount', () => ({
  __esModule: true,
  default: ({ value, withSign }: { value: string; withSign?: boolean }): JSX.Element => (
    <span data-testid='storage-deposit-amount'>{`${withSign ? '+' : ''}${value}`}</span>
  ),
}));

const renderRow = (storageDeposit: StorageDepositProps['storageDeposit']): JSX.Element => (
  <JotaiProvider>
    <ThemeProvider theme={theme}>
      <StorageDeposit storageDeposit={storageDeposit} />
    </ThemeProvider>
  </JotaiProvider>
);

const shownAmount = (): string | null => screen.getByTestId('storage-deposit-amount').textContent;

describe('StorageDeposit', () => {
  it('shows the deposit net of the refund', () => {
    render(renderRow({ storageDeposit: 1_000_000, unlockDeposit: 3_000_000 }));
    expect(shownAmount()).toBe('+2.000000');
  });

  it('follows a refund that changes while the deposit stays the same', () => {
    const { rerender } = render(renderRow({ storageDeposit: 1_000_000, unlockDeposit: 3_000_000 }));
    rerender(renderRow({ storageDeposit: 1_000_000, unlockDeposit: 5_000_000 }));
    expect(shownAmount()).toBe('+4.000000');
  });
});
