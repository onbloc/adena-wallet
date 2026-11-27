import { act, fireEvent, screen } from '@testing-library/react-native';

import { BackupMethodScreen } from '../../../../src/containers/onboarding/backup-method-screen';
import { useOnboardingStore } from '../../../../src/stores/onboarding.store';
import { renderScreen, resetStores } from '../../../helpers/render-screen';
import { createTestContainer } from '../../../helpers/test-container';

describe('BackupMethodScreen', () => {
  beforeEach(resetStores);

  it('routes each backup choice', async () => {
    const { navigation } = await renderScreen(BackupMethodScreen);

    await fireEvent.press(await screen.findByRole('button', { name: /iCloud backup/ }));
    expect(navigation.navigate).toHaveBeenLastCalledWith('BackupPassword');
    await fireEvent.press(screen.getByRole('button', { name: /Manual backup/ }));
    expect(navigation.navigate).toHaveBeenLastCalledWith('BackupPhrase');
    await fireEvent.press(screen.getByRole('button', { name: 'Back up later' }));
    expect(navigation.navigate).toHaveBeenLastCalledWith('ProtectWallet');
  });

  it('drops a backup password chosen before', async () => {
    useOnboardingStore.setState({ backupPassword: 'violet orbit lantern 42' });
    await renderScreen(BackupMethodScreen);

    expect(useOnboardingStore.getState().backupPassword).toBeNull();
  });

  it('hides the cloud option without a usable cloud', async () => {
    const env = createTestContainer({ cloudBackup: { available: false } });

    await renderScreen(BackupMethodScreen, { env });
    await act(async () => undefined);

    expect(screen.getByTestId('backup-method-manual')).toBeTruthy();
    expect(screen.queryByTestId('backup-method-cloud')).toBeNull();
  });

  it('explains what a recovery phrase is', async () => {
    await renderScreen(BackupMethodScreen);

    await fireEvent.press(screen.getByRole('button', { name: 'What is a recovery phrase?' }));
    expect(screen.getByRole('button', { name: 'Got it' })).toBeTruthy();
  });
});
