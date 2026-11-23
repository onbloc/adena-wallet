import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { UnlockScreen } from '../../../src/containers/unlock-screen';
import { AppErrorCode } from '../../../src/core/errors';
import { BiometricOutcome } from '../../../src/security/memory-secure-store';
import { SessionStatus, useSessionStore } from '../../../src/stores/session.store';
import { renderScreen, resetStores, setupWallet } from '../../helpers/render-screen';
import { TEST_PASSWORD } from '../../helpers/test-container';

jest.setTimeout(30_000);

const lockedWallet = async (biometrics = false) => {
  const setup = await setupWallet();

  if (biometrics) {
    await setup.env.container.walletService.enableBiometricUnlock(TEST_PASSWORD);
  }

  setup.env.container.walletService.lock();
  return setup;
};

describe('UnlockScreen', () => {
  beforeEach(resetStores);

  it('rejects a wrong password, clears the error on edit and unlocks with the right one', async () => {
    const { env } = await lockedWallet();

    await renderScreen(UnlockScreen, { env });
    const input = screen.getByLabelText('Password');

    await fireEvent(input, 'submitEditing');
    expect(useSessionStore.getState().status).toBe(SessionStatus.BOOTING);

    await fireEvent.changeText(input, 'wrong password');
    await fireEvent.press(screen.getByRole('button', { name: 'Unlock' }));
    expect(await screen.findByText('Incorrect password.')).toBeTruthy();

    await fireEvent.changeText(input, TEST_PASSWORD);
    expect(screen.queryByText('Incorrect password.')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Unlock' }));

    await waitFor(() => expect(useSessionStore.getState().status).toBe(SessionStatus.UNLOCKED));
    expect(useSessionStore.getState().revision).toBe(1);
    expect(env.container.keyringSession.isUnlocked()).toBe(true);
    expect(screen.getByLabelText('Password').props.value).toBe('');
  });

  it('ignores a second submit while unlocking', async () => {
    const { env } = await lockedWallet();
    let release: () => void = () => undefined;
    const unlock = jest.spyOn(env.container.walletService, 'unlock').mockImplementation(() => new Promise<void>((resolve) => {
      release = resolve;
    }));

    await renderScreen(UnlockScreen, { env });
    const input = screen.getByLabelText('Password');

    await fireEvent.changeText(input, TEST_PASSWORD);
    void fireEvent(input, 'submitEditing');
    expect(await screen.findByText('Unlocking…')).toBeTruthy();
    void fireEvent(input, 'submitEditing');
    release();

    await waitFor(() => expect(useSessionStore.getState().status).toBe(SessionStatus.UNLOCKED));
    expect(unlock).toHaveBeenCalledTimes(1);
  });

  it('shows unexpected unlock errors verbatim', async () => {
    const { env } = await lockedWallet();

    jest.spyOn(env.container.walletService, 'unlock').mockRejectedValue(new Error('Vault is damaged'));
    await renderScreen(UnlockScreen, { env });
    await fireEvent.changeText(screen.getByLabelText('Password'), TEST_PASSWORD);
    await fireEvent.press(screen.getByRole('button', { name: 'Unlock' }));

    expect(await screen.findByText('Vault is damaged')).toBeTruthy();
  });

  it('auto-prompts biometrics once and unlocks', async () => {
    const { env } = await lockedWallet(true);
    const biometric = jest.spyOn(env.container.walletService, 'unlockWithBiometrics');

    await renderScreen(UnlockScreen, { env });

    await waitFor(() => expect(useSessionStore.getState().status).toBe(SessionStatus.UNLOCKED));
    expect(biometric).toHaveBeenCalledTimes(1);
    expect(biometric).toHaveBeenCalledWith({ title: 'Unlock Adena', cancel: 'Use password' });
  });

  it('stays quiet when the prompt is canceled and retries from the button', async () => {
    const { env } = await lockedWallet(true);

    env.secureStore.biometricOutcome = BiometricOutcome.CANCEL;
    await renderScreen(UnlockScreen, { env });
    const button = await screen.findByRole('button', { name: /^Use / });

    expect(screen.queryByText(/biometric/i)).toBeNull();
    env.secureStore.biometricOutcome = BiometricOutcome.SUCCESS;
    await fireEvent.press(button);

    await waitFor(() => expect(useSessionStore.getState().status).toBe(SessionStatus.UNLOCKED));
  });

  it('reports other biometric failures', async () => {
    const { env } = await lockedWallet(true);

    env.secureStore.biometryKind = null;
    jest.spyOn(env.container.walletService, 'getBiometryKind').mockResolvedValue('face' as never);
    await renderScreen(UnlockScreen, { env });

    expect(await screen.findByText(AppErrorCode.BIOMETRICS_UNAVAILABLE)).toBeTruthy();
    expect(useSessionStore.getState().status).toBe(SessionStatus.BOOTING);
  });

  it('opens the reset flow', async () => {
    const { env } = await lockedWallet();
    const { navigation } = await renderScreen(UnlockScreen, { env });

    expect(screen.queryByRole('button', { name: /^Use / })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Forgot password? Reset wallet' }));
    expect(navigation.navigate).toHaveBeenCalledWith('ResetWallet');
  });
});
