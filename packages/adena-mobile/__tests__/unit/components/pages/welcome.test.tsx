import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { WelcomePage } from '../../../../src/components/pages';
import { renderPage } from './render-page';

describe('WelcomePage', () => {
  it('renders the hero and reports both onboarding choices', async () => {
    const onCreateWallet = jest.fn();
    const onImportWallet = jest.fn();

    await renderPage(<WelcomePage onCreateWallet={onCreateWallet} onImportWallet={onImportWallet} />);

    expect(screen.getByText('Adena')).toBeTruthy();
    expect(screen.getByText('A clear wallet for Gno.land and connected chains.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Create a new wallet' }));
    expect(onCreateWallet).toHaveBeenCalledTimes(1);
    expect(onImportWallet).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Import with recovery phrase' }));
    expect(onImportWallet).toHaveBeenCalledTimes(1);
  });

  it('offers a cloud restore only when given', async () => {
    const onRestore = jest.fn();

    await renderPage(<WelcomePage onCreateWallet={jest.fn()} onImportWallet={jest.fn()} />);
    expect(screen.queryByTestId('welcome-restore')).toBeNull();

    await renderPage(<WelcomePage onCreateWallet={jest.fn()} onImportWallet={jest.fn()} restoreLabel='Restore from iCloud' onRestore={onRestore} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Restore from iCloud' }));
    expect(onRestore).toHaveBeenCalledTimes(1);
  });
});
