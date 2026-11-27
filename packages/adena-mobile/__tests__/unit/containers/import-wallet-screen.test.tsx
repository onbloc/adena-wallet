import Clipboard from '@react-native-clipboard/clipboard';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

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

  it('counts the words and keeps Continue off while empty', async () => {
    const { navigation } = await renderScreen(ImportWalletScreen);

    expect(screen.getByText('0 words')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(navigation.navigate).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText('Recovery phrase'), 'one  two three');
    expect(screen.getByText('3 words')).toBeTruthy();
  });

  it('normalizes a valid phrase and moves on to the account list', async () => {
    const { navigation } = await renderScreen(ImportWalletScreen);

    await fireEvent.changeText(screen.getByLabelText('Recovery phrase'), `  ${TEST_MNEMONIC.toUpperCase().replace(/ /g, '   ')} `);
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(useOnboardingStore.getState().mnemonic).toBe(TEST_MNEMONIC);
    expect(navigation.navigate).toHaveBeenCalledWith('SelectAccounts');

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('pastes the phrase from the clipboard', async () => {
    jest.mocked(Clipboard.getString).mockResolvedValueOnce(`\n${TEST_MNEMONIC.replace(/ /g, '\n')}  `);
    await renderScreen(ImportWalletScreen);

    await fireEvent.press(screen.getByRole('button', { name: 'Paste' }));

    await waitFor(() => expect(screen.getByDisplayValue(TEST_MNEMONIC)).toBeTruthy());
    expect(screen.getByText(`${TEST_MNEMONIC.split(' ').length} words`)).toBeTruthy();
  });

  it('ignores an empty clipboard', async () => {
    await renderScreen(ImportWalletScreen);
    await fireEvent.changeText(screen.getByLabelText('Recovery phrase'), 'kept');

    await fireEvent.press(screen.getByRole('button', { name: 'Paste' }));

    expect(screen.getByDisplayValue('kept')).toBeTruthy();
  });
});
