import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RecoveryPhraseScreen } from '../../../../src/containers/main/recovery-phrase-screen';
import { AppError, AppErrorCode } from '../../../../src/core/errors';
import { BiometryKind } from '../../../../src/security/secure-store';
import { createWrapper } from '../../../helpers/query-wrapper';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const MNEMONIC = 'abandon ability able about above absent absorb abstract absurd abuse access accident';

const setup = async ({ enabled = true, revealMnemonicWithBiometrics = jest.fn(async () => MNEMONIC) } = {}) => {
  let blurListener: () => void = () => undefined;
  const walletService = {
    revealMnemonic: jest.fn(async () => MNEMONIC),
    revealMnemonicWithBiometrics,
    getBiometryKind: jest.fn(async () => BiometryKind.FACE),
    isBiometricUnlockEnabled: jest.fn(async () => enabled),
  };
  const { Wrapper } = createWrapper({ walletService });
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

  return { walletService, blur: () => blurListener() };
};

const biometricButton = () => screen.findByRole('button', { name: /^Use (Face ID|Face unlock)$/ });

describe('RecoveryPhraseScreen biometric reveal', () => {
  it('reveals the phrase with biometrics when biometric unlock is enabled', async () => {
    const { walletService } = await setup();

    await fireEvent.press(await biometricButton());

    expect(walletService.revealMnemonicWithBiometrics).toHaveBeenCalledWith('k', expect.objectContaining({ title: 'Show recovery phrase' }));
    expect(walletService.revealMnemonic).not.toHaveBeenCalled();
    expect(screen.getByText('12-word phrase')).toBeTruthy();
  });

  it('does not offer biometrics when biometric unlock is off', async () => {
    await setup({ enabled: false });

    await act(async () => undefined);
    expect(screen.queryByRole('button', { name: /^Use / })).toBeNull();
    expect(screen.getByPlaceholderText('Password')).toBeTruthy();
  });

  it('stays on the password input after a cancel, and explains a stale credential', async () => {
    const revealMnemonicWithBiometrics = jest.fn()
      .mockRejectedValueOnce(new AppError(AppErrorCode.BIOMETRICS_CANCELED, 'Authentication was canceled'))
      .mockRejectedValueOnce(new AppError(AppErrorCode.INVALID_PASSWORD, 'Incorrect password'));

    await setup({ revealMnemonicWithBiometrics });

    await fireEvent.press(await biometricButton());
    expect(screen.getByPlaceholderText('Password')).toBeTruthy();
    expect(screen.queryByText('Authentication was canceled')).toBeNull();

    await fireEvent.press(await biometricButton());
    expect(screen.getByText('Biometric password is out of date. Enter your password.')).toBeTruthy();
    expect(screen.queryByText('12-word phrase')).toBeNull();
  });

  it('drops a biometric reveal that finishes after the screen was left', async () => {
    let resolve: (value: string) => void = () => undefined;
    const revealMnemonicWithBiometrics = jest.fn(() => new Promise<string>((done) => {
      resolve = done;
    }));
    const { blur } = await setup({ revealMnemonicWithBiometrics });

    await fireEvent.press(await biometricButton());
    await act(async () => blur());
    await act(async () => resolve(MNEMONIC));

    expect(screen.queryByText('12-word phrase')).toBeNull();
  });
});
