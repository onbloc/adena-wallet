import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ProtectWalletScreen } from '../../../../src/containers/onboarding/protect-wallet-screen';
import { BiometryKind } from '../../../../src/security/secure-store';
import { useOnboardingStore } from '../../../../src/stores/onboarding.store';
import { renderScreen, resetStores } from '../../../helpers/render-screen';
import { createTestContainer } from '../../../helpers/test-container';

describe('ProtectWalletScreen', () => {
  beforeEach(resetStores);

  it('records the choice to enable biometrics and moves on', async () => {
    const env = createTestContainer();

    env.secureStore.biometryKind = BiometryKind.FACE;
    const { navigation } = await renderScreen(ProtectWalletScreen, { env });

    await fireEvent.press(await screen.findByRole('button', { name: 'Enable Face ID' }));
    expect(useOnboardingStore.getState().enableBiometrics).toBe(true);
    expect(navigation.navigate).toHaveBeenCalledWith('CreatePassword');
  });

  it('records a skip', async () => {
    useOnboardingStore.setState({ enableBiometrics: true });
    const env = createTestContainer();

    env.secureStore.biometryKind = BiometryKind.FINGERPRINT;
    const { navigation } = await renderScreen(ProtectWalletScreen, { env });

    expect(await screen.findByText('Touch ID')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Not now' }));
    expect(useOnboardingStore.getState().enableBiometrics).toBe(false);
    expect(navigation.navigate).toHaveBeenCalledWith('CreatePassword');
  });

  it('skips the step on a device without biometrics', async () => {
    useOnboardingStore.setState({ enableBiometrics: true });
    const env = createTestContainer();

    env.secureStore.biometryKind = null;
    const { navigation } = await renderScreen(ProtectWalletScreen, { env });

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('CreatePassword'));
    expect(useOnboardingStore.getState().enableBiometrics).toBe(false);
    expect(screen.queryByRole('button', { name: /Enable/ })).toBeNull();
  });
});
