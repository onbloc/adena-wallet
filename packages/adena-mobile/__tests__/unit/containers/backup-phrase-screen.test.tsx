import { fireEvent, screen } from '@testing-library/react-native';

import { BackupPhraseScreen } from '../../../src/containers/onboarding/backup-phrase-screen';
import { useOnboardingStore } from '../../../src/stores/onboarding.store';
import { SessionStatus, useSessionStore } from '../../../src/stores/session.store';
import { createMockNavigation, renderScreen, resetStores } from '../../helpers/render-screen';
import { createTestContainer, TEST_MNEMONIC, TEST_PASSWORD } from '../../helpers/test-container';

describe('BackupPhraseScreen', () => {
  beforeEach(resetStores);

  it('keeps the phrase masked and continues only after it was shown', async () => {
    useOnboardingStore.setState({ mnemonic: TEST_MNEMONIC });
    const { navigation } = await renderScreen(BackupPhraseScreen);

    expect(screen.queryByText('about')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(navigation.navigate).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Show phrase' }));
    expect(screen.getByText('about')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(navigation.navigate).toHaveBeenCalledWith('ProtectWallet');

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('renders an empty grid without a mnemonic', async () => {
    await renderScreen(BackupPhraseScreen);
    await fireEvent.press(screen.getByRole('button', { name: 'Show phrase' }));

    expect(screen.queryByText('about')).toBeNull();
  });

  describe('after a failed cloud backup', () => {
    it('blocks going back and enters the wallet once the phrase was shown', async () => {
      const env = createTestContainer();

      await env.container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });
      useOnboardingStore.setState({ mnemonic: TEST_MNEMONIC });
      const navigation = createMockNavigation();

      await renderScreen(BackupPhraseScreen, { env, navigation, params: { afterCreate: true } });

      expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
      expect(navigation.setOptions).toHaveBeenCalledWith({ gestureEnabled: false });
      const [, beforeRemove] = navigation.addListener.mock.calls.find(([event]) => event === 'beforeRemove')!;
      const event = { preventDefault: jest.fn() };

      (beforeRemove as unknown as (value: typeof event) => void)(event);
      expect(event.preventDefault).toHaveBeenCalled();

      await fireEvent.press(screen.getByRole('button', { name: 'Show phrase' }));
      await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

      expect(navigation.navigate).not.toHaveBeenCalled();
      expect(useSessionStore.getState().status).toBe(SessionStatus.UNLOCKED);
      expect(useOnboardingStore.getState().mnemonic).toBeNull();
    });
  });
});
