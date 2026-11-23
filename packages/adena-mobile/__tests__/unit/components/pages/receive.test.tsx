import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { ReceivePage, ReceivePageProps } from '../../../../src/components/pages';
import { renderPage } from './render-page';

const address = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';

const props = (overrides: Partial<ReceivePageProps> = {}): ReceivePageProps => ({
  accountName: 'Account 1',
  address,
  networkName: 'Gno.land',
  onCopy: jest.fn(),
  onShare: jest.fn(),
  onClose: jest.fn(),
  ...overrides,
});

describe('ReceivePage', () => {
  it('shows the full address and reports copy, share and close', async () => {
    const page = props();

    await renderPage(<ReceivePage {...page} />);

    expect(screen.getByText('Receive')).toBeTruthy();
    expect(screen.getByText('Account 1')).toBeTruthy();
    expect(screen.getByText(address)).toBeTruthy();
    expect(screen.getByText('Only send Gno.land assets to this address.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Copy address' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Share' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));

    expect(page.onCopy).toHaveBeenCalledTimes(1);
    expect(page.onShare).toHaveBeenCalledTimes(1);
    expect(page.onClose).toHaveBeenCalledTimes(1);
  });

  it('renders long names and testnet labels', async () => {
    const accountName = 'An extremely long account name used for layout testing purposes';

    await renderPage(<ReceivePage {...props({ accountName, networkName: 'Testnet 13' })} />);

    expect(screen.getByText(accountName)).toBeTruthy();
    expect(screen.getByText('Testnet 13')).toBeTruthy();
    expect(screen.getByText('Only send Testnet 13 assets to this address.')).toBeTruthy();
  });
});
