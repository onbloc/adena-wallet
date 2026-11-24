import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import React, { ReactElement, useState } from 'react';

import packageJson from '../../../../package.json';
import { SettingsPage } from '../../../components/pages';
import { KeyringType } from '../../../crypto/keyring';
import { useContainer } from '../../../di/container-provider';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainStackParamList } from '../../../navigation/types';
import { SessionStatus, useSessionStore } from '../../../stores/session.store';

export const SettingsScreen = ({ navigation }: NativeStackScreenProps<MainStackParamList, 'Settings'>): ReactElement => {
  const { walletService, preferenceService, connectedAppService } = useContainer();
  const { network, accounts, account } = useWalletSnapshot();
  const { setStatus } = useSessionStore();
  const queryClient = useQueryClient();

  const [haptics, setHaptics] = useState(preferenceService.get().hapticsEnabled);

  const recoveryKeyringId = account?.keyringType === KeyringType.HD_WALLET
    ? account.keyringId
    : accounts.find(item => item.keyringType === KeyringType.HD_WALLET)?.keyringId;

  const handleToggleHaptics = (value: boolean): void => setHaptics(preferenceService.update({ hapticsEnabled: value }).hapticsEnabled);

  const handleOpenNetworks = (): void => navigation.navigate('Networks');

  const handleOpenAccounts = (): void => navigation.navigate('Accounts');

  const handleOpenConnectedApps = (): void => navigation.navigate('ConnectedApps');

  const handleOpenRecoveryPhrase = (): void | '' | undefined => recoveryKeyringId && navigation.navigate('RecoveryPhrase', { keyringId: recoveryKeyringId });

  const handleOpenChangePassword = (): void => navigation.navigate('ChangePassword');

  const handleLock = (): void => {
    walletService.lock();
    queryClient.clear();
    setStatus(SessionStatus.LOCKED);
  };

  const handleOpenAddressBook = (): void => navigation.navigate('AddressBook');

  const handleOpenReset = (): void => navigation.navigate('ResetWallet');

  return (
    <SettingsPage
      networkName={network.networkName}
      accountCount={accounts.length}
      connectedAppCount={connectedAppService.getConnectedApps().length}
      hapticsEnabled={haptics}
      onToggleHaptics={handleToggleHaptics}
      appVersion={packageJson.version}
      onOpenNetworks={handleOpenNetworks}
      onOpenAccounts={handleOpenAccounts}
      onOpenConnectedApps={handleOpenConnectedApps}
      onOpenRecoveryPhrase={handleOpenRecoveryPhrase}
      onOpenChangePassword={handleOpenChangePassword}
      onLock={handleLock}
      onOpenAddressBook={handleOpenAddressBook}
      onOpenReset={handleOpenReset}
      onBack={navigation.goBack}
    />
  );
};
