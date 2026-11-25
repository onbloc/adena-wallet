import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { ResetWalletPage, ResetWalletPageProps } from '../../../../src/components/pages';
import { renderPage } from './render-page';

const props = (overrides: Partial<ResetWalletPageProps> = {}): ResetWalletPageProps => ({
  acknowledged: true,
  onToggleAcknowledged: jest.fn(),
  resetting: false,
  onReset: jest.fn(),
  onBack: jest.fn(),
  ...overrides,
});

describe('ResetWalletPage', () => {
  it('resets once acknowledged', async () => {
    const page = props();

    await renderPage(<ResetWalletPage {...page} />);

    expect(screen.getByText('• All accounts and their names')).toBeTruthy();
    await fireEvent.press(screen.getByRole('checkbox'));
    await fireEvent.press(screen.getByTestId('reset-confirm'));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(page.onToggleAcknowledged).toHaveBeenCalledWith(false);
    expect(page.onReset).toHaveBeenCalledTimes(1);
    expect(page.onBack).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Reset failed')).toBeNull();
  });

  it('blocks reset until acknowledged', async () => {
    const page = props({ acknowledged: false });

    await renderPage(<ResetWalletPage {...page} />);
    await fireEvent.press(screen.getByRole('checkbox'));
    await fireEvent.press(screen.getByTestId('reset-confirm'));

    expect(page.onToggleAcknowledged).toHaveBeenCalledWith(true);
    expect(page.onReset).not.toHaveBeenCalled();
  });

  it('shows progress and errors', async () => {
    const page = props({ resetting: true, error: 'Keychain locked' });

    await renderPage(<ResetWalletPage {...page} />);

    expect(screen.getByText('Resetting…')).toBeTruthy();
    expect(screen.getByText('Reset failed')).toBeTruthy();
    expect(screen.getByText('Keychain locked')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('reset-confirm'));
    expect(page.onReset).not.toHaveBeenCalled();
  });
});
