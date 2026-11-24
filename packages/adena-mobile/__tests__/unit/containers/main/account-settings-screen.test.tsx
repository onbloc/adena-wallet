import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AccountSettingsScreen } from '../../../../src/containers/main/account-settings-screen';
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
  });
});
