import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { BuyCryptoPage, BuyCryptoPageProps } from '../../../../src/components/pages';
import { renderPage } from './render-page';

const gnot = { key: 'ugnot', symbol: 'GNOT', name: 'Gno.land', localIcon: 'gnot' as const, balanceLabel: 'Balance: 10 GNOT' };
const gns = { key: 'gns', symbol: 'GNS', name: 'Gnoswap' };

const props = (overrides: Partial<BuyCryptoPageProps> = {}): BuyCryptoPageProps => ({
  amountLabel: '1,250.5',
  currency: 'USD',
  estimateLabel: 'Estimated 2,977.380952 GNOT before fees',
  token: gnot,
  tokenOptions: [gnot, gns],
  tokenPickerVisible: true,
  onOpenTokenPicker: jest.fn(),
  onCloseTokenPicker: jest.fn(),
  onSelectToken: jest.fn(),
  canContinue: true,
  onKeyPress: jest.fn(),
  onContinue: jest.fn(),
  onBack: jest.fn(),
  ...overrides,
});

describe('BuyCryptoPage', () => {
  it('renders the amount, estimate and token and reports actions', async () => {
    const page = props();

    await renderPage(<BuyCryptoPage {...page} />);

    expect(screen.getByText('1,250.5')).toBeTruthy();
    expect(screen.getByText('USD')).toBeTruthy();
    expect(screen.getByText('Estimated 2,977.380952 GNOT before fees')).toBeTruthy();
    await fireEvent.press(screen.getByRole('keyboardkey', { name: '7' }));
    await fireEvent.press(screen.getByTestId('buy-token'));
    await fireEvent.press(screen.getByRole('button', { name: 'Gnoswap, GNS' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(page.onKeyPress).toHaveBeenCalledWith('7');
    expect(page.onOpenTokenPicker).toHaveBeenCalledTimes(1);
    expect(page.onSelectToken).toHaveBeenCalledWith('gns');
    expect(page.onContinue).toHaveBeenCalledTimes(1);
    expect(page.onBack).toHaveBeenCalledTimes(1);
  });

  it('shows the unavailable state and disables continue', async () => {
    const page = props({
      amountLabel: '',
      estimateLabel: undefined,
      tokenOptions: [],
      tokenPickerVisible: false,
      canContinue: false,
      unavailable: { title: 'Buying GNOT isn’t available yet', description: 'No payment provider supports this token yet.' },
    });

    await renderPage(<BuyCryptoPage {...page} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByTestId('buy-amount').props.children).toBe('0');
    expect(screen.getByText('Buying GNOT isn’t available yet')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Gno.land, Balance: 10 GNOT' })).toBeNull();
    expect(page.onContinue).not.toHaveBeenCalled();
  });
});
