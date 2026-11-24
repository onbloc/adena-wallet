import { NavigationContainer } from '@react-navigation/native';
import { act, render, screen } from '@testing-library/react-native';
import React, { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { navigationRef } from '../../../src/navigation/navigation-ref';
import { RootNavigator } from '../../../src/navigation/root-navigator';
import { MainStackParamList } from '../../../src/navigation/types';
import { SessionStatus, useSessionStore } from '../../../src/stores/session.store';

const mockScreen = (name: string): ReactElement => {
  const { Text } = jest.requireActual('react-native');

  return <Text>{name}</Text>;
};

jest.mock('../../../src/containers/main/account-settings-screen', () => ({ AccountSettingsScreen: () => mockScreen('AccountSettingsScreen') }));
jest.mock('../../../src/containers/main/accounts-screen', () => ({ AccountsScreen: () => mockScreen('AccountsScreen') }));
jest.mock('../../../src/containers/main/activity-detail-screen', () => ({ ActivityDetailScreen: () => mockScreen('ActivityDetailScreen') }));
jest.mock('../../../src/containers/main/add-network-screen', () => ({ AddNetworkScreen: () => mockScreen('AddNetworkScreen') }));
jest.mock('../../../src/containers/main/add-token-screen', () => ({ AddTokenScreen: () => mockScreen('AddTokenScreen') }));
jest.mock('../../../src/containers/main/address-book-edit-screen', () => ({ AddressBookEditScreen: () => mockScreen('AddressBookEditScreen') }));
jest.mock('../../../src/containers/main/address-book-screen', () => ({ AddressBookScreen: () => mockScreen('AddressBookScreen') }));
jest.mock('../../../src/containers/main/cloud-backup-screen', () => ({ CloudBackupScreen: () => mockScreen('CloudBackupScreen') }));
jest.mock('../../../src/containers/main/connected-apps-screen', () => ({ ConnectedAppsScreen: () => mockScreen('ConnectedAppsScreen') }));
jest.mock('../../../src/containers/main/dapp-request-screen', () => ({ DappRequestScreen: () => mockScreen('DappRequestScreen') }));
jest.mock('../../../src/containers/main/import-account-screen', () => ({ ImportAccountScreen: () => mockScreen('ImportAccountScreen') }));
jest.mock('../../../src/containers/main/manage-nfts-screen', () => ({ ManageNftsScreen: () => mockScreen('ManageNftsScreen') }));
jest.mock('../../../src/containers/main/manage-tokens-screen', () => ({ ManageTokensScreen: () => mockScreen('ManageTokensScreen') }));
jest.mock('../../../src/containers/main/networks-screen', () => ({ NetworksScreen: () => mockScreen('NetworksScreen') }));
jest.mock('../../../src/containers/main/nft-collection-screen', () => ({ NftCollectionScreen: () => mockScreen('NftCollectionScreen') }));
jest.mock('../../../src/containers/main/nft-detail-screen', () => ({ NftDetailScreen: () => mockScreen('NftDetailScreen') }));
jest.mock('../../../src/containers/main/receive-screen', () => ({ ReceiveScreen: () => mockScreen('ReceiveScreen') }));
jest.mock('../../../src/containers/main/recovery-phrase-screen', () => ({ RecoveryPhraseScreen: () => mockScreen('RecoveryPhraseScreen') }));
jest.mock('../../../src/containers/main/send-amount-screen', () => ({ SendAmountScreen: () => mockScreen('SendAmountScreen') }));
jest.mock('../../../src/containers/main/send-nft-screen', () => ({ SendNftScreen: () => mockScreen('SendNftScreen') }));
jest.mock('../../../src/containers/main/send-recipient-screen', () => ({ SendRecipientScreen: () => mockScreen('SendRecipientScreen') }));
jest.mock('../../../src/containers/main/settings-screen', () => ({ SettingsScreen: () => mockScreen('SettingsScreen') }));
jest.mock('../../../src/containers/main/token-details-screen', () => ({ TokenDetailsScreen: () => mockScreen('TokenDetailsScreen') }));
jest.mock('../../../src/containers/onboarding/backup-phrase-screen', () => ({ BackupPhraseScreen: () => mockScreen('BackupPhraseScreen') }));
jest.mock('../../../src/containers/onboarding/create-password-screen', () => ({ CreatePasswordScreen: () => mockScreen('CreatePasswordScreen') }));
jest.mock('../../../src/containers/onboarding/import-wallet-screen', () => ({ ImportWalletScreen: () => mockScreen('ImportWalletScreen') }));
jest.mock('../../../src/containers/onboarding/restore-backup-screen', () => ({ RestoreBackupScreen: () => mockScreen('RestoreBackupScreen') }));
jest.mock('../../../src/containers/onboarding/welcome-screen', () => ({ WelcomeScreen: () => mockScreen('WelcomeScreen') }));
jest.mock('../../../src/containers/reset-wallet-screen', () => ({ ResetWalletScreen: () => mockScreen('ResetWalletScreen') }));
jest.mock('../../../src/containers/unlock-screen', () => ({ UnlockScreen: () => mockScreen('UnlockScreen') }));
jest.mock('../../../src/navigation/main-tabs', () => ({ MainTabs: () => mockScreen('MainTabs') }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const renderRoot = () => render(
  <SafeAreaProvider initialMetrics={metrics}>
    <NavigationContainer ref={navigationRef}>
      <RootNavigator />
    </NavigationContainer>
  </SafeAreaProvider>,
);

describe('RootNavigator', () => {
  it('renders nothing while booting', async () => {
    useSessionStore.setState({ status: SessionStatus.BOOTING });
    await renderRoot();
    expect(screen.queryByText(/./)).toBeNull();
  });

  it('starts onboarding without a wallet and reaches every onboarding screen', async () => {
    useSessionStore.setState({ status: SessionStatus.EMPTY });
    await renderRoot();
    expect(screen.getByText('WelcomeScreen')).toBeTruthy();

    for (const [route, name] of [['BackupPhrase', 'BackupPhraseScreen'], ['ImportWallet', 'ImportWalletScreen'], ['CreatePassword', 'CreatePasswordScreen'], ['RestoreBackup', 'RestoreBackupScreen']]) {
      await act(async () => (navigationRef.navigate as (route: string) => void)(route));
      expect(await screen.findByText(name)).toBeTruthy();
    }
  });

  it('shows only the unlock stack while locked', async () => {
    useSessionStore.setState({ status: SessionStatus.LOCKED });
    await renderRoot();
    expect(screen.getByText('UnlockScreen')).toBeTruthy();
    await act(async () => (navigationRef.navigate as (route: string) => void)('ResetWallet'));
    expect(await screen.findByText('ResetWalletScreen')).toBeTruthy();
    expect(navigationRef.getRootState()?.routeNames).toEqual(['Unlock', 'ResetWallet']);
  });

  it('mounts the main stack when unlocked and swaps stacks on lock', async () => {
    useSessionStore.setState({ status: SessionStatus.UNLOCKED });
    await renderRoot();
    expect(screen.getByText('MainTabs')).toBeTruthy();
    expect(navigationRef.getRootState()?.routeNames).toHaveLength(31);

    await act(async () => navigationRef.navigate('DappRequest'));
    expect(await screen.findByText('DappRequestScreen')).toBeTruthy();
    await act(async () => navigationRef.navigate('Receive'));
    expect(await screen.findByText('ReceiveScreen')).toBeTruthy();

    const routes: (keyof MainStackParamList)[] = ['SendRecipient', 'Settings', 'Networks', 'CloudBackup'];

    for (const route of routes) {
      await act(async () => (navigationRef.navigate as (route: string) => void)(route));
      expect(await screen.findByText(`${route}Screen`)).toBeTruthy();
    }

    await act(async () => useSessionStore.setState({ status: SessionStatus.LOCKED }));
    expect(await screen.findByText('UnlockScreen')).toBeTruthy();
    expect(screen.queryByText('MainTabs')).toBeNull();
  });
});
