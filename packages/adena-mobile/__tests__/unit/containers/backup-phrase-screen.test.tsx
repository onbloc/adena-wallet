import { fireEvent, screen } from '@testing-library/react-native';

import { BackupPhraseScreen } from '../../../src/containers/onboarding/backup-phrase-screen';
import { useOnboardingStore } from '../../../src/stores/onboarding.store';
import { renderScreen, resetStores } from '../../helpers/render-screen';
import { TEST_MNEMONIC } from '../../helpers/test-container';

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
    expect(useOnboardingStore.getState().phraseSaved).toBe(true);

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('renders an empty grid without a mnemonic', async () => {
    await renderScreen(BackupPhraseScreen);
    await fireEvent.press(screen.getByRole('button', { name: 'Show phrase' }));

    expect(screen.queryByText('about')).toBeNull();
  });
});
