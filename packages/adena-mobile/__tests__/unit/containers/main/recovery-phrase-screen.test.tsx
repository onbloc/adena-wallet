import Clipboard from '@react-native-clipboard/clipboard';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RecoveryPhraseScreen } from '../../../../src/containers/main/recovery-phrase-screen';
import { SENSITIVE_CLIPBOARD_TTL_MS } from '../../../../src/hooks/use-sensitive-clipboard';
import { createWrapper } from '../../../helpers/query-wrapper';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const MNEMONIC = 'abandon ability able about above absent absorb abstract absurd abuse access accident';

describe('RecoveryPhraseScreen', () => {
  let appStateListener: (state: AppStateStatus) => void;
  let blurListener: () => void;

  const setup = async (revealMnemonic: jest.Mock) => {
    const { Wrapper } = createWrapper({ walletService: { revealMnemonic } });
    const navigation = {
      goBack: jest.fn(),
      addListener: jest.fn((_event: string, handler: () => void) => {
        blurListener = handler;
        return jest.fn();
      }),
    };
    const route = { key: 'RecoveryPhrase', name: 'RecoveryPhrase', params: { keyringId: 'k' } };
    const Screen = RecoveryPhraseScreen as unknown as React.ComponentType<{ navigation: unknown; route: unknown }>;

    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <Wrapper><Screen navigation={navigation} route={route} /></Wrapper>
      </SafeAreaProvider>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Show recovery phrase' }));
    await fireEvent.changeText(screen.getByPlaceholderText('Password'), 'secret');
  };

  beforeEach(() => {
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      appStateListener = handler as (state: AppStateStatus) => void;
      return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    jest.mocked(Clipboard.setString).mockClear();
    jest.mocked(Clipboard.getString).mockReset().mockResolvedValue('');
  });

  const revealAndCopy = async () => {
    await setup(jest.fn(async () => MNEMONIC));
    await fireEvent.press(screen.getByRole('button', { name: 'Reveal phrase' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Copy' }));
    expect(Clipboard.setString).toHaveBeenLastCalledWith(MNEMONIC);
  };

  it('clears the copied phrase from the clipboard after 60 seconds', async () => {
    jest.useFakeTimers();
    await revealAndCopy();
    jest.mocked(Clipboard.getString).mockResolvedValue(MNEMONIC);

    await act(async () => jest.advanceTimersByTime(SENSITIVE_CLIPBOARD_TTL_MS - 1));
    expect(Clipboard.setString).toHaveBeenCalledTimes(1);
    await act(async () => jest.advanceTimersByTime(1));

    expect(Clipboard.setString).toHaveBeenLastCalledWith('');
  });

  it('leaves the clipboard alone when it no longer holds the phrase', async () => {
    jest.useFakeTimers();
    await revealAndCopy();
    jest.mocked(Clipboard.getString).mockResolvedValue('something else');

    await act(async () => jest.advanceTimersByTime(SENSITIVE_CLIPBOARD_TTL_MS));

    expect(Clipboard.getString).toHaveBeenCalledTimes(1);
    expect(Clipboard.setString).toHaveBeenCalledTimes(1);
  });

  it('clears the copied phrase when the screen loses focus', async () => {
    jest.useFakeTimers();
    await revealAndCopy();
    jest.mocked(Clipboard.getString).mockResolvedValue(MNEMONIC);

    await act(async () => blurListener());
    expect(Clipboard.setString).toHaveBeenLastCalledWith('');
    expect(screen.queryByText('abandon')).toBeNull();

    // The pending timer was cancelled together with the clear.
    await act(async () => jest.advanceTimersByTime(SENSITIVE_CLIPBOARD_TTL_MS));
    expect(Clipboard.setString).toHaveBeenCalledTimes(2);
  });

  it('hides the revealed phrase when the app goes to the background', async () => {
    await setup(jest.fn(async () => MNEMONIC));
    await fireEvent.press(screen.getByRole('button', { name: 'Reveal phrase' }));
    expect(screen.getByText('abandon')).toBeTruthy();

    await act(async () => appStateListener('inactive'));
    expect(screen.getByText('abandon')).toBeTruthy();
    await act(async () => appStateListener('background'));

    expect(screen.queryByText('abandon')).toBeNull();
    expect(screen.getByRole('button', { name: 'Show recovery phrase' })).toBeTruthy();
  });

  it('does not show a phrase whose reveal finished after leaving the screen', async () => {
    let resolve!: (value: string) => void;

    await setup(jest.fn(() => new Promise<string>((done) => {
      resolve = done;
    })));
    // The press stays in act() until the reveal settles, so blur and resolve happen inside it.
    const pressing = fireEvent.press(screen.getByRole('button', { name: 'Reveal phrase' }));

    blurListener();
    resolve(MNEMONIC);
    await pressing;

    expect(screen.queryByText('abandon')).toBeNull();
  });
});
