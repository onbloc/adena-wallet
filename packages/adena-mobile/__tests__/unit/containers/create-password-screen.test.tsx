import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { CreatePasswordScreen } from '../../../src/containers/onboarding/create-password-screen';
import { useOnboardingStore } from '../../../src/stores/onboarding.store';
import { SessionStatus, useSessionStore } from '../../../src/stores/session.store';
import { renderScreen, resetStores, toastMessage } from '../../helpers/render-screen';
import { createTestContainer, TEST_MNEMONIC, TEST_PASSWORD } from '../../helpers/test-container';

jest.setTimeout(30_000);

const fill = async (password: string, confirm: string): Promise<void> => {
  await fireEvent.changeText(screen.getByLabelText('Password'), password);
  await fireEvent.changeText(screen.getByLabelText('Confirm password'), confirm);
  await fireEvent.press(screen.getByRole('button', { name: 'Create wallet' }));
};

describe('CreatePasswordScreen', () => {
  beforeEach(resetStores);

  it('validates length and confirmation, clearing errors on edit', async () => {
    useOnboardingStore.setState({ mnemonic: TEST_MNEMONIC });
    const { navigation } = await renderScreen(CreatePasswordScreen);

    await fill('short', 'short');
    expect(screen.getByText('Password must be 8~256 characters')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Password'), TEST_PASSWORD);
    expect(screen.queryByText('Password must be 8~256 characters')).toBeNull();

    await fill('12345678', '12345678');
    expect(screen.getByText('Password is too simple.')).toBeTruthy();

    await fill(TEST_PASSWORD, 'something else');
    expect(screen.getByText('Passwords do not match')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Confirm password'), TEST_PASSWORD);
    expect(screen.queryByText('Passwords do not match')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('returns to the start when the mnemonic is gone', async () => {
    const { navigation } = await renderScreen(CreatePasswordScreen);

    await fill(TEST_PASSWORD, TEST_PASSWORD);
    expect(navigation.popToTop).toHaveBeenCalled();
  });

  it('creates the wallet, turns on biometric unlock automatically and unlocks the session', async () => {
    useOnboardingStore.setState({ mnemonic: TEST_MNEMONIC });
    const { env } = await renderScreen(CreatePasswordScreen);

    expect(screen.queryByRole('switch')).toBeNull();
    await fill(TEST_PASSWORD, TEST_PASSWORD);

    await waitFor(() => expect(useSessionStore.getState().status).toBe(SessionStatus.UNLOCKED));
    expect(useSessionStore.getState().revision).toBe(1);
    expect(useOnboardingStore.getState().mnemonic).toBeNull();
    expect(env.container.accountService.getAccounts()).toHaveLength(1);
    await expect(env.container.walletService.isBiometricUnlockEnabled()).resolves.toBe(true);
  });

  it('warns but still finishes when biometrics cannot be enabled', async () => {
    useOnboardingStore.setState({ mnemonic: TEST_MNEMONIC });
    const env = createTestContainer();

    jest.spyOn(env.container.walletService, 'enableBiometricUnlock').mockRejectedValue(new Error('denied'));
    await renderScreen(CreatePasswordScreen, { env });
    await fill(TEST_PASSWORD, TEST_PASSWORD);

    await waitFor(() => expect(useSessionStore.getState().status).toBe(SessionStatus.UNLOCKED));
    expect(toastMessage()).toBe('Biometric unlock could not be enabled');
  });

  it('skips biometrics without hardware and surfaces creation errors', async () => {
    useOnboardingStore.setState({ mnemonic: 'not a valid phrase' });
    const env = createTestContainer();

    env.secureStore.biometryKind = null;
    await renderScreen(CreatePasswordScreen, { env });
    await fill(TEST_PASSWORD, TEST_PASSWORD);

    expect(await screen.findByText('Invalid recovery phrase')).toBeTruthy();
    expect(screen.queryByRole('switch')).toBeNull();
    expect(useSessionStore.getState().status).toBe(SessionStatus.BOOTING);
    expect(screen.getByRole('button', { name: 'Create wallet' })).toBeTruthy();
  });
});
