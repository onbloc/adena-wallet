import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RecoveryPhraseScreen } from '../../../../src/containers/main/recovery-phrase-screen';
import { AppError, AppErrorCode } from '../../../../src/core/errors';
import { BiometryKind } from '../../../../src/security/secure-store';
import { createWrapper } from '../../../helpers/query-wrapper';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const MNEMONIC = 'abandon ability able about above absent absorb abstract absurd abuse access accident';

const setup = async ({ enabled = true, readBiometricPassword = jest.fn(async () => 'escrowed password') } = {}) => {
  let blurListener: () => void = () => undefined;
  const walletService = {
    revealMnemonic: jest.fn(async () => MNEMONIC),
    readBiometricPassword,
    getBiometryKind: jest.fn(async () => BiometryKind.FACE),
    isBiometricUnlockEnabled: jest.fn(async () => enabled),
  };
  const { Wrapper } = createWrapper({ walletService });
  const navigation = {
    goBack: jest.fn(),
    getState: jest.fn(),
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
  await act(async () => undefined);
  await fireEvent.press(screen.getByRole('button', { name: 'Show recovery phrase' }));
  await act(async () => undefined);

  return { walletService, blur: () => blurListener() };
};

const biometricButton = () => screen.findByRole('button', { name: /^Use (Face ID|Face unlock)$/ });

describe('RecoveryPhraseScreen biometric reveal', () => {
  it('prompts biometrics as soon as the sheet opens and reveals through the password path', async () => {
    const { walletService } = await setup();

    expect(walletService.readBiometricPassword).toHaveBeenCalledTimes(1);
    expect(walletService.readBiometricPassword).toHaveBeenCalledWith(expect.objectContaining({ title: 'Show recovery phrase' }));
    expect(walletService.revealMnemonic).toHaveBeenCalledWith('k', 'escrowed password');
    expect(await screen.findByText('12-word phrase')).toBeTruthy();
  });

  it('does not prompt or offer biometrics when biometric unlock is off', async () => {
    const { walletService } = await setup({ enabled: false });

    expect(walletService.readBiometricPassword).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /^Use / })).toBeNull();
    expect(screen.getByPlaceholderText('Password')).toBeTruthy();
  });

  it('falls back to the password after a cancel, retries from the button, and explains a stale credential', async () => {
    const readBiometricPassword = jest.fn()
      .mockRejectedValueOnce(new AppError(AppErrorCode.BIOMETRICS_CANCELED, 'Authentication was canceled'))
      .mockRejectedValueOnce(new AppError(AppErrorCode.INVALID_PASSWORD, 'Incorrect password'));
    const { walletService } = await setup({ readBiometricPassword });

    expect(screen.getByPlaceholderText('Password')).toBeTruthy();
    expect(screen.queryByText('Authentication was canceled')).toBeNull();
    expect(readBiometricPassword).toHaveBeenCalledTimes(1);

    await fireEvent.press(await biometricButton());
    expect(readBiometricPassword).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Biometric password is out of date. Enter your password.')).toBeTruthy();
    expect(walletService.revealMnemonic).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByPlaceholderText('Password'), 'typed password');
    await fireEvent.press(screen.getByRole('button', { name: 'Reveal phrase' }));
    expect(walletService.revealMnemonic).toHaveBeenCalledWith('k', 'typed password');
    expect(await screen.findByText('12-word phrase')).toBeTruthy();
  });

  it('drops a reveal that finishes after the screen was left', async () => {
    let resolve: (value: string) => void = () => undefined;
    const readBiometricPassword = jest.fn(() => new Promise<string>((done) => {
      resolve = done;
    }));
    const { walletService, blur } = await setup({ readBiometricPassword });

    await act(async () => blur());
    await act(async () => resolve('escrowed password'));
    expect(walletService.revealMnemonic).not.toHaveBeenCalled();
    expect(screen.queryByText('12-word phrase')).toBeNull();
  });
});
