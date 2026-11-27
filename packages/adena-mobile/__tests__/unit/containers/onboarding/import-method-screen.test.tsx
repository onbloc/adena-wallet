import { act, fireEvent, screen } from '@testing-library/react-native';

import { ImportMethodScreen } from '../../../../src/containers/onboarding/import-method-screen';
import { useOnboardingStore } from '../../../../src/stores/onboarding.store';
import { renderScreen, resetStores } from '../../../helpers/render-screen';
import { createTestContainer, TEST_MNEMONIC } from '../../../helpers/test-container';

describe('ImportMethodScreen', () => {
  beforeEach(resetStores);

  it('opens the phrase import and clears a pending phrase', async () => {
    useOnboardingStore.setState({ mnemonic: TEST_MNEMONIC });
    const { navigation } = await renderScreen(ImportMethodScreen);

    await fireEvent.press(screen.getByTestId('import-method-phrase'));
    expect(useOnboardingStore.getState().mnemonic).toBeNull();
    expect(navigation.navigate).toHaveBeenCalledWith('ImportWallet');
  });

  it('opens the cloud restore', async () => {
    const { navigation } = await renderScreen(ImportMethodScreen);

    await fireEvent.press(await screen.findByTestId('import-method-cloud'));
    expect(screen.getByText('iCloud backup')).toBeTruthy();
    expect(navigation.navigate).toHaveBeenCalledWith('RestoreBackup');
  });

  it('offers only the phrase without a usable cloud', async () => {
    const env = createTestContainer({ cloudBackup: { available: false } });

    await renderScreen(ImportMethodScreen, { env });
    await act(async () => undefined);
    expect(screen.queryByTestId('import-method-cloud')).toBeNull();
  });
});
