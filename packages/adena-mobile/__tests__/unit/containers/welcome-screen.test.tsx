import { fireEvent, screen } from '@testing-library/react-native';

import { WelcomeScreen } from '../../../src/containers/onboarding/welcome-screen';
import { isValidMnemonic } from '../../../src/crypto/mnemonic';
import { useOnboardingStore } from '../../../src/stores/onboarding.store';
import { renderScreen, resetStores } from '../../helpers/render-screen';

describe('WelcomeScreen', () => {
  beforeEach(resetStores);

  it('generates a fresh mnemonic before showing the backup phrase', async () => {
    const { navigation } = await renderScreen(WelcomeScreen);

    await fireEvent.press(screen.getByRole('button', { name: 'Create a new wallet' }));

    expect(isValidMnemonic(useOnboardingStore.getState().mnemonic ?? '')).toBe(true);
    expect(navigation.navigate).toHaveBeenCalledWith('BackupPhrase');
  });

  it('clears any pending mnemonic when importing', async () => {
    useOnboardingStore.setState({ mnemonic: 'stale words' });
    const { navigation } = await renderScreen(WelcomeScreen);

    await fireEvent.press(screen.getByRole('button', { name: 'Import with recovery phrase' }));

    expect(useOnboardingStore.getState().mnemonic).toBeNull();
    expect(navigation.navigate).toHaveBeenCalledWith('ImportWallet');
  });
});
