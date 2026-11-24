import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AccountSettingsScreen } from '../../../../src/containers/main/account-settings-screen';
import { BiometryKind } from '../../../../src/security/secure-store';
import { ACCOUNT, createWrapper, NETWORK } from '../../../helpers/query-wrapper';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

describe('AccountSettingsScreen', () => {
  it('opens the edit profile page for the account', async () => {
    const { Wrapper } = createWrapper({
      accountService: { getCurrentAccount: () => ACCOUNT, getAccounts: () => [ACCOUNT], getAddress: () => 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5' },
      networkService: { getCurrentNetwork: () => NETWORK, getNetworks: () => [NETWORK] },
      connectedAppService: { getConnectedApps: () => [] },
      walletService: {},
    });
    const navigation = { goBack: jest.fn(), navigate: jest.fn(), popToTop: jest.fn() };
    const Screen = AccountSettingsScreen as unknown as React.ComponentType<{ navigation: unknown; route: unknown }>;

    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <Wrapper><Screen navigation={navigation} route={{ key: 'AccountSettings', name: 'AccountSettings', params: { accountId: ACCOUNT.id } }} /></Wrapper>
      </SafeAreaProvider>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Edit profile' }));

    expect(navigation.navigate).toHaveBeenCalledWith('EditProfile', { accountId: ACCOUNT.id });

    // Same destination as Settings > Manage > Connected apps.
    await fireEvent.press(screen.getByRole('button', { name: 'Manage connections, 0' }));
    expect(navigation.navigate).toHaveBeenLastCalledWith('ConnectedApps');
  });

  it('removes the account with biometrics as soon as the confirmation sheet opens', async () => {
    const OTHER = { ...ACCOUNT, id: 'acc-2', name: 'B' };
    const walletService = {
      removeAccount: jest.fn(async () => undefined),
      readBiometricPassword: jest.fn(async () => 'escrowed'),
      getBiometryKind: jest.fn(async () => BiometryKind.FINGERPRINT),
      isBiometricUnlockEnabled: jest.fn(async () => true),
    };
    const { Wrapper } = createWrapper({
      accountService: { getCurrentAccount: () => ACCOUNT, getAccounts: () => [ACCOUNT, OTHER], getAddress: () => 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5' },
      networkService: { getCurrentNetwork: () => NETWORK, getNetworks: () => [NETWORK] },
      connectedAppService: { getConnectedApps: () => [] },
      walletService,
    });
    const navigation = { goBack: jest.fn(), navigate: jest.fn(), popToTop: jest.fn() };
    const Screen = AccountSettingsScreen as unknown as React.ComponentType<{ navigation: unknown; route: unknown }>;

    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <Wrapper><Screen navigation={navigation} route={{ key: 'AccountSettings', name: 'AccountSettings', params: { accountId: ACCOUNT.id } }} /></Wrapper>
      </SafeAreaProvider>,
    );
    await act(async () => undefined);
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: /Remove account/ }));
    });

    await waitFor(() => expect(walletService.removeAccount).toHaveBeenCalledWith(ACCOUNT.id, 'escrowed'));
    expect(walletService.readBiometricPassword).toHaveBeenCalledWith(expect.objectContaining({ title: 'Remove account' }));
    expect(navigation.popToTop).toHaveBeenCalledTimes(1);
  });
});
