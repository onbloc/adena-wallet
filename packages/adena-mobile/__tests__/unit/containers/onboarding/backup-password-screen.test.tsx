import { fireEvent, screen } from '@testing-library/react-native';

import { BackupPasswordScreen } from '../../../../src/containers/onboarding/backup-password-screen';
import { useOnboardingStore } from '../../../../src/stores/onboarding.store';
import { renderScreen, resetStores } from '../../../helpers/render-screen';

const STRONG = 'violet orbit lantern 42';

const fill = async (password: string, confirm: string): Promise<void> => {
  await fireEvent.changeText(screen.getByTestId('backup-password-input'), password);
  await fireEvent.changeText(screen.getByTestId('backup-password-confirm'), confirm);
  await fireEvent.press(screen.getByTestId('backup-password-submit'));
};

describe('BackupPasswordScreen', () => {
  beforeEach(resetStores);

  it('rejects a weak or mismatched password and keeps nothing', async () => {
    const { navigation } = await renderScreen(BackupPasswordScreen);

    await fill('short', 'short');
    expect(screen.getByText('Backup password must be 12~256 characters')).toBeTruthy();

    await fill(STRONG, `${STRONG}x`);
    expect(screen.getByText('Passwords do not match')).toBeTruthy();
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(useOnboardingStore.getState().backupPassword).toBeNull();
  });

  it('labels the strength and keeps an accepted password for after the wallet is created', async () => {
    const { navigation } = await renderScreen(BackupPasswordScreen);

    expect(screen.getByText('BACKUP / ICLOUD')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('backup-password-input'), STRONG);
    expect(screen.getByText(/^(Good|Strong) password$/)).toBeTruthy();

    await fill(STRONG, STRONG);
    expect(useOnboardingStore.getState().backupPassword).toBe(STRONG);
    expect(navigation.navigate).toHaveBeenCalledWith('ProtectWallet');
  });
});
