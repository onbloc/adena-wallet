import { toErrorMessage } from '../core/error-message';
import { AppErrorCode, isAppError } from '../core/errors';
import { CloudBackupProvider } from '../repositories/cloud-backup/cloud-backup-store';
import { CloudBackupStatus, RemoteChange } from '../services/cloud-backup.service';
import { formatDateTime } from './activity.presenter';

export interface BackupNoticeView {
  title: string;
  description: string;
}

export const cloudProviderName = (provider: CloudBackupProvider): string =>
  provider === CloudBackupProvider.GOOGLE_DRIVE ? 'Google Drive' : 'iCloud';

export const formatBackupTime = (epochMs: number): string =>
  (Number.isFinite(epochMs) ? formatDateTime(new Date(epochMs).toISOString()) : undefined) ?? '-';

// "Recovery phrase" for the common single-phrase wallet, counts otherwise.
export const backedUpItemLabels = (status: Extract<CloudBackupStatus, { kind: 'backedUp' }>): string[] => {
  const labels: string[] = [];

  if (status.mnemonicCount > 0) {
    labels.push(status.mnemonicCount === 1 ? 'Recovery phrase' : `Recovery phrases (${status.mnemonicCount})`);
  }

  if (status.privateKeyCount > 0) {
    labels.push(status.privateKeyCount === 1 ? 'Private key' : `Private keys (${status.privateKeyCount})`);
  }

  return labels;
};

export const describeBackupError = (error: unknown, provider: CloudBackupProvider): BackupNoticeView => {
  const name = cloudProviderName(provider);

  if (isAppError(error, AppErrorCode.CLOUD_BACKUP_UNAVAILABLE)) {
    return provider === CloudBackupProvider.ICLOUD
      ? { title: 'iCloud is not available', description: 'Sign in to iCloud in Settings and turn on iCloud Drive, then try again.' }
      : { title: 'Google Drive is not available', description: 'Google Play services are required to back up to Google Drive. Update Google Play services, then try again.' };
  }

  if (isAppError(error, AppErrorCode.CLOUD_BACKUP_NOT_SIGNED_IN) || isAppError(error, AppErrorCode.USER_REJECTED)) {
    return { title: `Not signed in to ${name}`, description: `Allow Adena to use ${name} to continue.` };
  }

  if (isAppError(error, AppErrorCode.CLOUD_BACKUP_QUOTA)) {
    return { title: `${name} storage is full`, description: `Free up ${name} storage, then try again.` };
  }

  if (isAppError(error, AppErrorCode.NETWORK_ERROR)) {
    return { title: `Can't reach ${name}`, description: 'Check your internet connection and try again.' };
  }

  return { title: 'Something went wrong', description: toErrorMessage(error) };
};

export const describeRemoteChange = (change: RemoteChange, provider: CloudBackupProvider): BackupNoticeView => {
  const name = cloudProviderName(provider);

  switch (change) {
    case RemoteChange.UPDATED_ELSEWHERE:
      return { title: 'Updated on another device', description: `The backup in ${name} was changed on another device. Backing up again replaces that version.` };
    case RemoteChange.ROLLED_BACK:
      return { title: 'Older backup found', description: `The backup in ${name} is older than the last one made on this device. Back up again to replace it.` };
    case RemoteChange.UNREADABLE:
      return { title: 'Backup can\'t be read', description: `The backup in ${name} is damaged. Back up again to replace it.` };
  }
};
