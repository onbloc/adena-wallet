import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { RecoveryPhrasePage, RecoveryPhrasePageProps } from '../../../../src/components/pages';
import { renderPage, wrapPage } from './render-page';

const props = (overrides: Partial<RecoveryPhrasePageProps> = {}): RecoveryPhrasePageProps => ({
  passwordSheetVisible: false,
  onOpenPasswordSheet: jest.fn(),
  onClosePasswordSheet: jest.fn(),
  password: 'secret',
  onChangePassword: jest.fn(),
  verifying: false,
  onReveal: jest.fn(),
  onCopy: jest.fn(),
  onBack: jest.fn(),
  ...overrides,
});

describe('RecoveryPhrasePage', () => {
  it('masks the phrase and opens the password sheet', async () => {
    const page = props();

    await renderPage(<RecoveryPhrasePage {...page} />);

    expect(screen.getByLabelText('Recovery phrase hidden')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Copy' })).toBeNull();
    expect(screen.getAllByText('••••••')).toHaveLength(12);
    expect(screen.queryByLabelText('Password')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Show recovery phrase' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(page.onOpenPasswordSheet).toHaveBeenCalledTimes(1);
    expect(page.onBack).toHaveBeenCalledTimes(1);
  });

  it('asks for the password in the sheet and reports every action', async () => {
    const page = props({ passwordSheetVisible: true, error: 'Incorrect password' });

    await renderPage(<RecoveryPhrasePage {...page} />);

    expect(screen.getByText('Incorrect password')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Password'), 'next');
    await fireEvent.press(screen.getByRole('button', { name: 'Reveal phrase' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));

    expect(page.onChangePassword).toHaveBeenCalledWith('next');
    expect(page.onReveal).toHaveBeenCalledTimes(1);
    expect(page.onClosePasswordSheet).toHaveBeenCalledTimes(1);
  });

  it('disables reveal without a password and shows verifying', async () => {
    const page = props({ passwordSheetVisible: true, password: '' });
    const { rerender } = await renderPage(<RecoveryPhrasePage {...page} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Reveal phrase' }));
    expect(page.onReveal).not.toHaveBeenCalled();

    await rerender(wrapPage(<RecoveryPhrasePage {...props({ passwordSheetVisible: true, verifying: true })} />));
    expect(screen.getByText('Verifying…')).toBeTruthy();
  });

  it('shows the phrase with its word count once revealed', async () => {
    const page = props({ passwordSheetVisible: true, words: ['alpha', 'beta', 'gamma'] });

    await renderPage(<RecoveryPhrasePage {...page} />);

    expect(screen.getByText('3-word phrase')).toBeTruthy();
    expect(screen.getByText('alpha')).toBeTruthy();
    expect(screen.getByText('gamma')).toBeTruthy();
    expect(screen.queryByText('••••••')).toBeNull();
    expect(screen.queryByLabelText('Password')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Show recovery phrase' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Copy' }));
    expect(page.onCopy).toHaveBeenCalledTimes(1);
  });
});
