import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import React, { ReactElement, useCallback, useState } from 'react';

import packageJson from '../../../../package.json';
import { SettingsPage } from '../../../components/pages';
import { KeyringType } from '../../../crypto/keyring';
import { useContainer } from '../../../di/container-provider';
import { usePasswordGate } from '../../../hooks/use-password-gate';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainStackParamList } from '../../../navigation/types';
import { queryKeys } from '../../../queries/query-keys';
import { useBiometricStatusQuery } from '../../../queries/wallet.queries';
import { SessionStatus, useSessionStore } from '../../../stores/session.store';
import { useToastStore } from '../../../stores/toast.store';
import { getBiometryLabel } from '../../../utils/biometry';

export const SettingsScreen = ({ navigation }: NativeStackScreenProps<MainStackParamList, 'Settings'>): ReactElement => {
  const { walletService, preferenceService, connectedAppService } = useContainer();
  const { network, accounts, account } = useWalletSnapshot();
  const { setStatus } = useSessionStore();
  const showToast = useToastStore(state => state.show);
  const queryClient = useQueryClient();

  const biometric = useBiometricStatusQuery();
  const biometricLabel = getBiometryLabel(biometric.data?.kind ?? null);
  const biometricEnabled = Boolean(biometric.data?.enabled);
  const refreshBiometric = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.biometric() }),
    [queryClient],
  );
  const [haptics, setHaptics] = useState(preferenceService.get().hapticsEnabled);

  const enableBiometrics = useCallback(async (password: string) => {
    await walletService.enableBiometricUnlock(password);
    await refreshBiometric();
    showToast(`${biometricLabel ?? 'Biometric'} unlock enabled`, 'success');
  }, [biometricLabel, refreshBiometric, showToast, walletService]);
  const biometricGate = usePasswordGate(enableBiometrics);

  const recoveryKeyringId = account?.keyringType === KeyringType.HD_WALLET
    ? account.keyringId
    : accounts.find(item => item.keyringType === KeyringType.HD_WALLET)?.keyringId;

  const handleToggleBiometric = async (value: boolean): Promise<void> => {
    if (value) {
      biometricGate.open();
      return;
    }

    await walletService.disableBiometricUnlock();
    await refreshBiometric();
  };

  const handleToggleHaptics = (value: boolean): void => setHaptics(preferenceService.update({ hapticsEnabled: value }).hapticsEnabled);

  const handleOpenNetworks = (): void => navigation.navigate('Networks');

  const handleOpenAccounts = (): void => navigation.navigate('Accounts');

  const handleOpenConnectedApps = (): void => navigation.navigate('ConnectedApps');

  const handleOpenRecoveryPhrase = (): void | '' | undefined => recoveryKeyringId && navigation.navigate('RecoveryPhrase', { keyringId: recoveryKeyringId });

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
      biometricLabel={biometricLabel}
      biometricEnabled={biometricEnabled}
      onToggleBiometric={handleToggleBiometric}
      hapticsEnabled={haptics}
      onToggleHaptics={handleToggleHaptics}
      appVersion={packageJson.version}
      onOpenNetworks={handleOpenNetworks}
      onOpenAccounts={handleOpenAccounts}
      onOpenConnectedApps={handleOpenConnectedApps}
      onOpenRecoveryPhrase={handleOpenRecoveryPhrase}
      onLock={handleLock}
      onOpenAddressBook={handleOpenAddressBook}
      onOpenReset={handleOpenReset}
      passwordSheet={{ ...biometricGate.sheetProps, confirmLabel: 'Enable' }}
      onBack={navigation.goBack}
    />
  );
};
