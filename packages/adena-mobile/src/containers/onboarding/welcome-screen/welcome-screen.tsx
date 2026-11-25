import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement } from 'react';

import { WelcomePage } from '../../../components/pages';
import { AppErrorCode, isAppError } from '../../../core/errors';
import { useContainer } from '../../../di/container-provider';
import { OnboardingStackParamList } from '../../../navigation/types';
import { cloudProviderName } from '../../../presenters/cloud-backup.presenter';
import { useCloudBackupAvailableQuery, useRestorableBackupsQuery } from '../../../queries/cloud-backup.queries';
import { CloudBackupProvider } from '../../../repositories/cloud-backup/cloud-backup-store';
import { useOnboardingStore } from '../../../stores/onboarding.store';

export const WelcomeScreen = ({ navigation }: NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>): ReactElement => {
  const { walletService, cloudBackupService } = useContainer();
  const setMnemonic = useOnboardingStore(state => state.setMnemonic);
  const clearOnboarding = useOnboardingStore(state => state.clear);
  const available = useCloudBackupAvailableQuery();
  const provider = cloudBackupService.provider;
  const backups = useRestorableBackupsQuery({ interactive: false, enabled: available.data === true && provider !== CloudBackupProvider.ICLOUD });

  // Google Drive cannot be searched before the user grants access, and a fresh iCloud install may not have
  // synced the file list yet, so the option shows whenever the cloud is usable (the restore page can check again).
  const canRestore = available.data === true && (
    provider === CloudBackupProvider.ICLOUD
    || (backups.data?.length ?? 0) > 0
    || isAppError(backups.error, AppErrorCode.CLOUD_BACKUP_NOT_SIGNED_IN)
  );

  // Backing out to the start drops a phrase or decrypted backup that was entered and then abandoned.
  useFocusEffect(clearOnboarding);

  const handleCreateWallet = (): void => {
    setMnemonic(walletService.generateMnemonic());
    navigation.navigate('BackupPhrase');
  };

  const handleImportWallet = (): void => {
    setMnemonic(null);
    navigation.navigate('ImportWallet');
  };

  const handleRestore = (): void => {
    clearOnboarding();
    navigation.navigate('RestoreBackup');
  };

  return (
    <WelcomePage
      onCreateWallet={handleCreateWallet}
      onImportWallet={handleImportWallet}
      restoreLabel={canRestore ? `Restore from ${cloudProviderName(provider)}` : undefined}
      onRestore={handleRestore}
    />
  );
};
