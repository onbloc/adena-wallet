import { AppErrorCode, isAppError } from '../../core/errors';
import { useContainer } from '../../di/container-provider';
import { cloudProviderName } from '../../presenters/cloud-backup.presenter';
import { useCloudBackupAvailableQuery, useRestorableBackupsQuery } from '../../queries/cloud-backup.queries';
import { CloudBackupProvider } from '../../repositories/cloud-backup/cloud-backup-store';

// Provider name (e.g. "iCloud") when a cloud backup may be restored or written; undefined otherwise.
export const useCloudProvider = (options: { forRestore: boolean }): string | undefined => {
  const { cloudBackupService } = useContainer();
  const available = useCloudBackupAvailableQuery();
  const provider = cloudBackupService.provider;
  const backups = useRestorableBackupsQuery({
    interactive: false,
    enabled: options.forRestore && available.data === true && provider !== CloudBackupProvider.ICLOUD,
  });

  if (available.data !== true) {
    return undefined;
  }

  // Google Drive cannot be searched before the user grants access, and a fresh iCloud install may not have
  // synced the file list yet, so restore shows whenever the cloud is usable (the restore page can check again).
  const canUse = !options.forRestore
    || provider === CloudBackupProvider.ICLOUD
    || (backups.data?.length ?? 0) > 0
    || isAppError(backups.error, AppErrorCode.CLOUD_BACKUP_NOT_SIGNED_IN);

  return canUse ? cloudProviderName(provider) : undefined;
};
