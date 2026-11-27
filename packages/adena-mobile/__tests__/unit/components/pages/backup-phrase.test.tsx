import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { BackupPhrasePage, BackupPhrasePageProps } from '../../../../src/components/pages';
import { renderPage } from './render-page';

const words = Array.from({ length: 24 }, (_, index) => `word${index + 1}`);

const props = (overrides: Partial<BackupPhrasePageProps> = {}): BackupPhrasePageProps => ({
  words,
  masked: false,
  onReveal: jest.fn(),
  canContinue: true,
  onContinue: jest.fn(),
  onBack: jest.fn(),
  ...overrides,
});

describe('BackupPhrasePage', () => {
  it('titles the page with the word count and renders every word', async () => {
    const page = props();

    await renderPage(<BackupPhrasePage {...page} />);

    expect(screen.getByText('24 words.\nOne wallet.')).toBeTruthy();
    expect(screen.getByText('word1')).toBeTruthy();
    expect(screen.getByText('word24')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Show phrase' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(page.onContinue).toHaveBeenCalledTimes(1);
    expect(page.onBack).toHaveBeenCalledTimes(1);
  });

  it('blocks continuing until allowed', async () => {
    const page = props({ canContinue: false });

    await renderPage(<BackupPhrasePage {...page} />);
    await fireEvent.press(screen.getByTestId('backup-continue'));

    expect(page.onContinue).not.toHaveBeenCalled();
  });

  it('renders no words while masked and reveals on request', async () => {
    const onReveal = jest.fn();

    await renderPage(<BackupPhrasePage {...props({ masked: true, onReveal })} />);

    expect(screen.queryByText('word1')).toBeNull();
    expect(screen.getByTestId('backup-phrase-masked')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Show phrase' }));
    expect(onReveal).toHaveBeenCalledTimes(1);
  });
});
