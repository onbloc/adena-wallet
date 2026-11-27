import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { BackupPhraseScreen } from '../../../../src/containers/onboarding/backup-phrase-screen';
import { ContainerProvider } from '../../../../src/di/container-provider';
import { useOnboardingStore } from '../../../../src/stores/onboarding.store';
import { TEST_MNEMONIC } from '../../../helpers/test-container';
import { wrapPage } from '../../components/pages/render-page';

type BackupPhraseProps = Parameters<typeof BackupPhraseScreen>[0];

describe('BackupPhraseScreen', () => {
  let listener: (state: AppStateStatus) => void;
  const remove = jest.fn();
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  const props = { navigation, route: { key: 'BackupPhrase', name: 'BackupPhrase' } } as unknown as BackupPhraseProps;
  const firstWord = TEST_MNEMONIC.split(' ')[0];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      listener = handler as (state: AppStateStatus) => void;
      return { remove } as never;
    });
    useOnboardingStore.setState({ mnemonic: TEST_MNEMONIC });
  });

  afterEach(() => jest.restoreAllMocks());

  it.each<AppStateStatus>(['inactive', 'background'])('hides the phrase when the app turns %s and shows it again on request', async (state) => {
    await render(wrapPage(<ContainerProvider container={{} as never}><BackupPhraseScreen {...props} /></ContainerProvider>));
    await fireEvent.press(screen.getByRole('button', { name: 'Show phrase' }));
    expect(screen.getAllByText(firstWord).length).toBeGreaterThan(0);

    await act(async () => listener(state));
    await act(async () => listener('active'));
    expect(screen.queryByText(firstWord)).toBeNull();
    expect(screen.getByTestId('backup-phrase-masked')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Show phrase' }));
    expect(screen.getAllByText(firstWord).length).toBeGreaterThan(0);
  });

  it('keeps the onboarding flow working while the phrase is hidden', async () => {
    await render(wrapPage(<ContainerProvider container={{} as never}><BackupPhraseScreen {...props} /></ContainerProvider>));
    await fireEvent.press(screen.getByRole('button', { name: 'Show phrase' }));
    await act(async () => listener('background'));

    expect(screen.getByTestId('backup-phrase-masked')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('backup-continue'));
    expect(navigation.navigate).toHaveBeenCalledWith('ProtectWallet');
  });

  it('stops listening once the screen is gone', async () => {
    const { unmount } = await render(wrapPage(<ContainerProvider container={{} as never}><BackupPhraseScreen {...props} /></ContainerProvider>));

    await unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
