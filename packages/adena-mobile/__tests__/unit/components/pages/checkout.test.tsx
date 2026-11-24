import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { CheckoutPage, CheckoutPageProps } from '../../../../src/components/pages';
import { renderPage } from './render-page';

const props = (overrides: Partial<CheckoutPageProps> = {}): CheckoutPageProps => ({
  amountLabel: '$150.00',
  tokenName: 'Gno.land',
  providers: [{ id: 'a', name: 'Provider A', paymentMethods: 'Debit card · Apple Pay' }],
  onSelectProvider: jest.fn(),
  onBack: jest.fn(),
  ...overrides,
});

describe('CheckoutPage', () => {
  it('lists providers with the provider note and reports selection', async () => {
    const page = props();

    await renderPage(<CheckoutPage {...page} />);

    expect(screen.getByText('$150.00')).toBeTruthy();
    expect(screen.getByText('Buying Gno.land')).toBeTruthy();
    expect(screen.getByText('Continue on the provider’s website to review the final quote, payment details and fees.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Provider A, Debit card · Apple Pay' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(page.onSelectProvider).toHaveBeenCalledWith('a');
    expect(page.onBack).toHaveBeenCalledTimes(1);
  });

  it('shows an empty state without providers', async () => {
    await renderPage(<CheckoutPage {...props({ providers: [] })} />);

    expect(screen.getByText('No providers available')).toBeTruthy();
  });
});
