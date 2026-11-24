import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ImportAccountScreen } from '../../../../src/containers/main/import-account-screen';
import { AppError, AppErrorCode } from '../../../../src/core/errors';
import { SecretImportMode } from '../../../../src/domain/account';
import { ACCOUNT, createWrapper } from '../../../helpers/query-wrapper';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const setup = async (mode: SecretImportMode = SecretImportMode.MNEMONIC) => {
  const walletService = {
    addMnemonicKeyring: jest.fn(async () => ACCOUNT),
    importPrivateKey: jest.fn(async () => ACCOUNT),
    readBiometricPassword: jest.fn(),
  };
  const { Wrapper } = createWrapper({ walletService });
  const navigation = { goBack: jest.fn(), popToTop: jest.fn() };
  const Screen = ImportAccountScreen as unknown as React.ComponentType<{ navigation: unknown; route: unknown }>;

  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <Wrapper><Screen navigation={navigation} route={{ key: 'ImportAccount', name: 'ImportAccount', params: { mode } }} /></Wrapper>
    </SafeAreaProvider>,
  );
  return { walletService, navigation };
};

describe('ImportAccountScreen while unlocked', () => {
  it('imports from the last field without asking for the wallet password', async () => {
    const { walletService, navigation } = await setup();

    await fireEvent.changeText(screen.getByTestId('import-secret'), 'word word');
    await fireEvent.changeText(screen.getByTestId('import-account-name'), 'Second');
    await fireEvent(screen.getByTestId('import-account-name'), 'submitEditing');

    await waitFor(() => expect(walletService.addMnemonicKeyring).toHaveBeenCalledWith('word word', 'Second'));
    expect(navigation.popToTop).toHaveBeenCalledTimes(1);
    expect(walletService.readBiometricPassword).not.toHaveBeenCalled();
    expect(screen.queryByTestId('password-sheet-input', { includeHiddenElements: true })).toBeNull();
  });

  it('shows a secret error on the field and imports once per tap', async () => {
    const { walletService } = await setup(SecretImportMode.PRIVATE_KEY);
    let reject: (error: unknown) => void = () => undefined;

    walletService.importPrivateKey.mockImplementationOnce(() => new Promise((_resolve, fail) => {
      reject = fail;
    }));
    await fireEvent.changeText(screen.getByTestId('import-secret'), 'xyz');
    await act(async () => {
      fireEvent.press(screen.getByTestId('import-submit'));
      fireEvent.press(screen.getByTestId('import-submit'));
    });
    expect(walletService.importPrivateKey).toHaveBeenCalledTimes(1);
    await act(async () => reject(new AppError(AppErrorCode.INVALID_REQUEST, 'Invalid private key')));
    expect(await screen.findByText('Invalid private key')).toBeTruthy();
  });
});
