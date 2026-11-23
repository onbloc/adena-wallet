import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { BackupPhrasePage, BackupPhrasePageProps } from '../../../../src/components/pages';
import { renderPage } from './render-page';

const words = Array.from({ length: 24 }, (_, index) => `word${index + 1}`);

const props = (overrides: Partial<BackupPhrasePageProps> = {}): BackupPhrasePageProps => ({
  words,
  acknowledged: true,
  onToggleAcknowledged: jest.fn(),
  onContinue: jest.fn(),
  onBack: jest.fn(),
  ...overrides,
});

describe('BackupPhrasePage', () => {
  it('renders every word and reports every action', async () => {
    const page = props();

    await renderPage(<BackupPhrasePage {...page} />);

    expect(screen.getByText('word1')).toBeTruthy();
    expect(screen.getByText('word24')).toBeTruthy();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'I saved my recovery phrase' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(page.onToggleAcknowledged).toHaveBeenCalledWith(false);
    expect(page.onContinue).toHaveBeenCalledTimes(1);
    expect(page.onBack).toHaveBeenCalledTimes(1);
  });

  it('blocks continuing until acknowledged', async () => {
    const page = props({ acknowledged: false });

    await renderPage(<BackupPhrasePage {...page} />);
    await fireEvent.press(screen.getByTestId('backup-continue'));
    await fireEvent.press(screen.getByRole('checkbox'));

    expect(page.onContinue).not.toHaveBeenCalled();
    expect(page.onToggleAcknowledged).toHaveBeenCalledWith(true);
  });
});
