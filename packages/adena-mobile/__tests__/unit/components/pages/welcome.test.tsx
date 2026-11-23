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
});
