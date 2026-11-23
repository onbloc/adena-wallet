import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { ImportWalletPage, ImportWalletPageProps } from '../../../../src/components/pages';
import { SecretImportMode } from '../../../../src/domain/account';
import { renderPage } from './render-page';

const props = (overrides: Partial<ImportWalletPageProps> = {}): ImportWalletPageProps => ({
  mode: SecretImportMode.MNEMONIC,
  secret: 'abandon abandon about',
  onChangeSecret: jest.fn(),
  onSubmit: jest.fn(),
  onBack: jest.fn(),
  ...overrides,
});

describe('ImportWalletPage', () => {
  it('imports a recovery phrase with default labels', async () => {
    const page = props();

    await renderPage(<ImportWalletPage {...page} />);

    expect(screen.getByText('Import wallet')).toBeTruthy();
    expect(screen.getByText('Enter your 12 or 24 word recovery phrase, separated by spaces.')).toBeTruthy();
    expect(screen.queryByLabelText('Account name')).toBeNull();
    expect(screen.queryByLabelText('Wallet password')).toBeNull();

    await fireEvent.changeText(screen.getByLabelText('Recovery phrase'), 'word word');
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(page.onChangeSecret).toHaveBeenCalledWith('word word');
    expect(page.onSubmit).toHaveBeenCalledTimes(1);
    expect(page.onBack).toHaveBeenCalledTimes(1);
  });

  it('imports a private key with account name and password', async () => {
    const page = props({
      title: 'Add private key',
      mode: SecretImportMode.PRIVATE_KEY,
      secret: '0xabc',
      accountName: 'Imported',
      onChangeAccountName: jest.fn(),
      password: 'pw',
      onChangePassword: jest.fn(),
      error: 'Invalid private key',
      submitLabel: 'Import',
    });

    await renderPage(<ImportWalletPage {...page} />);

    expect(screen.getByText('Add private key')).toBeTruthy();
    expect(screen.getByText('Enter the 64 character hex private key.')).toBeTruthy();
    expect(screen.getByText('Invalid private key')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Private key'), '0xdef');
    await fireEvent.changeText(screen.getByLabelText('Account name'), 'Renamed');
    await fireEvent.changeText(screen.getByLabelText('Wallet password'), 'secret');
    await fireEvent.press(screen.getByRole('button', { name: 'Import' }));

    expect(page.onChangeSecret).toHaveBeenCalledWith('0xdef');
    expect(page.onChangeAccountName).toHaveBeenCalledWith('Renamed');
    expect(page.onChangePassword).toHaveBeenCalledWith('secret');
    expect(page.onSubmit).toHaveBeenCalledTimes(1);
  });

  it.each([
    { secret: '   ' },
    { secret: 'words', password: '', onChangePassword: jest.fn() },
  ])('disables submit when input is incomplete (%#)', async (overrides) => {
    const page = props(overrides);

    await renderPage(<ImportWalletPage {...page} />);
    await fireEvent.press(screen.getByTestId('import-submit'));
    expect(page.onSubmit).not.toHaveBeenCalled();
  });

  it('blocks submit while submitting', async () => {
    const page = props({ submitting: true });

    await renderPage(<ImportWalletPage {...page} />);
    await fireEvent.press(screen.getByTestId('import-submit'));
    expect(page.onSubmit).not.toHaveBeenCalled();
  });
});
