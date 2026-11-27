import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { WelcomePage } from '../../../../src/components/pages';
import { renderPage } from './render-page';

describe('WelcomePage', () => {
  it('renders the hero and reports both onboarding choices', async () => {
    const onCreateWallet = jest.fn();
    const onImportWallet = jest.fn();

    await renderPage(<WelcomePage onCreateWallet={onCreateWallet} onImportWallet={onImportWallet} />);

    expect(screen.getByText('ADENA')).toBeTruthy();
    expect(screen.getByText('Your wallet.\nYour world.')).toBeTruthy();
    // The promo card of the concept is intentionally not part of the page.
    expect(screen.queryByText('Your assets, together.')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Create a wallet' }));
    expect(onCreateWallet).toHaveBeenCalledTimes(1);
    expect(onImportWallet).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Import a wallet' }));
    expect(onImportWallet).toHaveBeenCalledTimes(1);
  });

  it('has no cloud restore button of its own', async () => {
    await renderPage(<WelcomePage onCreateWallet={jest.fn()} onImportWallet={jest.fn()} />);
    expect(screen.queryByTestId('welcome-restore')).toBeNull();
  });
});
