import { act, fireEvent, screen } from '@testing-library/react-native';

import { RecoveryPhraseScreen } from '../../../src/containers/main/recovery-phrase-screen';
import { renderScreen, resetStores, setupWallet } from '../../helpers/render-screen';
import { TEST_PASSWORD } from '../../helpers/test-container';

describe('RecoveryPhraseScreen', () => {
  beforeEach(resetStores);

  it('reveals the phrase with the right password and forgets it on blur', async () => {
    const { env, account } = await setupWallet();
    const { navigation } = await renderScreen(RecoveryPhraseScreen, { env, params: { keyringId: account.keyringId } });

    expect(screen.queryByText('about')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Show recovery phrase' }));
    const input = screen.getByLabelText('Password');

    await fireEvent.changeText(input, 'wrong password');
    await fireEvent.press(screen.getByRole('button', { name: 'Reveal phrase' }));
    expect(await screen.findByText('Incorrect password.')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Password'), TEST_PASSWORD);
    expect(screen.queryByText('Incorrect password.')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Reveal phrase' }));

    expect(await screen.findByText('about')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Show recovery phrase' })).toBeNull();

    await act(() => navigation.emit('blur'));
    expect(screen.queryByText('about')).toBeNull();
    // Revealing again asks for the password from an empty field.
    await fireEvent.press(screen.getByRole('button', { name: 'Show recovery phrase' }));
    expect(screen.getByLabelText('Password').props.value).toBe('');

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('shows other failures as they are', async () => {
    const { env } = await setupWallet();

    await renderScreen(RecoveryPhraseScreen, { env, params: { keyringId: 'missing' } });
    jest.spyOn(env.container.walletService, 'revealMnemonic').mockRejectedValueOnce(new Error('Keyring not found'));
    await fireEvent.press(screen.getByRole('button', { name: 'Show recovery phrase' }));
    await fireEvent.changeText(screen.getByLabelText('Password'), TEST_PASSWORD);
    await fireEvent.press(screen.getByRole('button', { name: 'Reveal phrase' }));

    expect(await screen.findByText('Keyring not found')).toBeTruthy();
  });
});
