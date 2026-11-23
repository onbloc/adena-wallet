import { fireEvent, screen } from '@testing-library/react-native';

import { ImportWalletScreen } from '../../../src/containers/onboarding/import-wallet-screen';
import { useOnboardingStore } from '../../../src/stores/onboarding.store';
import { renderScreen, resetStores } from '../../helpers/render-screen';
import { TEST_MNEMONIC } from '../../helpers/test-container';

describe('ImportWalletScreen', () => {
  beforeEach(resetStores);

  it('rejects an invalid phrase and clears the error on edit', async () => {
    const { navigation } = await renderScreen(ImportWalletScreen);
    const input = screen.getByLabelText('Recovery phrase');

    await fireEvent.changeText(input, 'not a real phrase');
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText('Check the words and their order.')).toBeTruthy();
    expect(navigation.navigate).not.toHaveBeenCalled();

    await fireEvent.changeText(input, 'not a real phrase either');
    expect(screen.queryByText('Check the words and their order.')).toBeNull();
  });

  it('normalizes a valid phrase and moves on to the password step', async () => {
    const { navigation } = await renderScreen(ImportWalletScreen);

    await fireEvent.changeText(screen.getByLabelText('Recovery phrase'), `  ${TEST_MNEMONIC.toUpperCase().replace(/ /g, '   ')} `);
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(useOnboardingStore.getState().mnemonic).toBe(TEST_MNEMONIC);
    expect(navigation.navigate).toHaveBeenCalledWith('CreatePassword');

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(navigation.goBack).toHaveBeenCalled();
  });
});
