import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { RecoveryPhrasePage, RecoveryPhrasePageProps } from '../../../../src/components/pages';
import { renderPage, wrapPage } from './render-page';

type SheetOverrides = Partial<RecoveryPhrasePageProps['passwordSheet']>;

const props = (overrides: Partial<RecoveryPhrasePageProps> = {}, sheet: SheetOverrides = {}): RecoveryPhrasePageProps => ({
  onOpenPasswordSheet: jest.fn(),
  passwordSheet: {
    visible: false,
    password: 'secret',
    onChangePassword: jest.fn(),
    submitting: false,
    onConfirm: jest.fn(),
    onClose: jest.fn(),
    ...sheet,
  },
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
    const page = props({}, { visible: true, error: 'Incorrect password' });

    await renderPage(<RecoveryPhrasePage {...page} />);

    expect(screen.getByText('Incorrect password')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Password'), 'next');
    await fireEvent.press(screen.getByRole('button', { name: 'Reveal phrase' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));

    expect(page.passwordSheet.onChangePassword).toHaveBeenCalledWith('next');
    expect(page.passwordSheet.onConfirm).toHaveBeenCalledTimes(1);
    expect(page.passwordSheet.onClose).toHaveBeenCalledTimes(1);
  });

  it('disables reveal without a password and shows verifying', async () => {
    const page = props({}, { visible: true, password: '' });
    const { rerender } = await renderPage(<RecoveryPhrasePage {...page} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Reveal phrase' }));
    expect(page.passwordSheet.onConfirm).not.toHaveBeenCalled();

    await rerender(wrapPage(<RecoveryPhrasePage {...props({}, { visible: true, submitting: true })} />));
    expect(screen.getByText('Verifying…')).toBeTruthy();
  });

  it('shows the phrase with its word count once revealed', async () => {
    const page = props({ words: ['alpha', 'beta', 'gamma'] }, { visible: true });

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
