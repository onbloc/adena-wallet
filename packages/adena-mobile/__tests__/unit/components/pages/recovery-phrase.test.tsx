import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { RecoveryPhrasePage, RecoveryPhrasePageProps } from '../../../../src/components/pages';
import { renderPage } from './render-page';

const props = (overrides: Partial<RecoveryPhrasePageProps> = {}): RecoveryPhrasePageProps => ({
  password: 'secret',
  onChangePassword: jest.fn(),
  verifying: false,
  onReveal: jest.fn(),
  onBack: jest.fn(),
  ...overrides,
});

describe('RecoveryPhrasePage', () => {
  it('asks for the password and reports every action', async () => {
    const page = props({ error: 'Incorrect password' });

    await renderPage(<RecoveryPhrasePage {...page} />);

    expect(screen.getByText('Incorrect password')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Password'), 'next');
    await fireEvent.press(screen.getByRole('button', { name: 'Reveal phrase' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(page.onChangePassword).toHaveBeenCalledWith('next');
    expect(page.onReveal).toHaveBeenCalledTimes(1);
    expect(page.onBack).toHaveBeenCalledTimes(1);
  });

  it('disables reveal without a password and shows verifying', async () => {
    const page = props({ password: '' });
    const { rerender } = await renderPage(<RecoveryPhrasePage {...page} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Reveal phrase' }));
    expect(page.onReveal).not.toHaveBeenCalled();

    await rerender(<RecoveryPhrasePage {...props({ verifying: true })} />);
    expect(screen.getByText('Verifying…')).toBeTruthy();
  });

  it('shows the phrase once revealed', async () => {
    await renderPage(<RecoveryPhrasePage {...props({ words: ['alpha', 'beta', 'gamma'] })} />);

    expect(screen.getByText('alpha')).toBeTruthy();
    expect(screen.getByText('gamma')).toBeTruthy();
    expect(screen.queryByLabelText('Password')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reveal phrase' })).toBeNull();
  });
});
