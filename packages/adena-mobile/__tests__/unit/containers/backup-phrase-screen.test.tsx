import { fireEvent, screen } from '@testing-library/react-native';

import { BackupPhraseScreen } from '../../../src/containers/onboarding/backup-phrase-screen';
import { useOnboardingStore } from '../../../src/stores/onboarding.store';
import { renderScreen, resetStores } from '../../helpers/render-screen';
import { TEST_MNEMONIC } from '../../helpers/test-container';

describe('BackupPhraseScreen', () => {
  beforeEach(resetStores);

  it('shows the phrase and continues only after the acknowledgement', async () => {
    useOnboardingStore.setState({ mnemonic: TEST_MNEMONIC });
    const { navigation } = await renderScreen(BackupPhraseScreen);

    expect(screen.getByText('about')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(navigation.navigate).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('checkbox', { name: 'I saved my recovery phrase' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(navigation.navigate).toHaveBeenCalledWith('CreatePassword');

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('renders an empty grid without a mnemonic', async () => {
    await renderScreen(BackupPhraseScreen);

    expect(screen.queryByText('about')).toBeNull();
  });
});
