import { AppError, AppErrorCode } from '../../../src/core/errors';
import { backedUpItemLabels, cloudProviderName, describeBackupError, describeRemoteChange, formatBackupTime } from '../../../src/presenters/cloud-backup.presenter';

const status = (mnemonicCount: number, privateKeyCount: number) =>
  ({ kind: 'backedUp', fileName: 'f', backedUpAt: 0, outdated: false, mnemonicCount, privateKeyCount }) as const;

describe('cloud backup presenter', () => {
  it('names the provider', () => {
    expect(cloudProviderName('icloud')).toBe('iCloud');
    expect(cloudProviderName('google-drive')).toBe('Google Drive');
  });

  it('formats the backup time like activity dates', () => {
    expect(formatBackupTime(new Date(2026, 10, 24, 9, 5).getTime())).toBe('2026-11-24 09:05');
    expect(formatBackupTime(Number.NaN)).toBe('-');
  });

  it('labels what the backup holds', () => {
    expect(backedUpItemLabels(status(1, 0))).toEqual(['Recovery phrase']);
    expect(backedUpItemLabels(status(2, 1))).toEqual(['Recovery phrases (2)', 'Private key']);
    expect(backedUpItemLabels(status(0, 3))).toEqual(['Private keys (3)']);
  });

  it('describes cloud errors per provider', () => {
    expect(describeBackupError(new AppError(AppErrorCode.CLOUD_BACKUP_UNAVAILABLE), 'icloud').title).toBe('iCloud is not available');
    expect(describeBackupError(new AppError(AppErrorCode.CLOUD_BACKUP_UNAVAILABLE), 'google-drive').description).toMatch(/Google Play services/);
    expect(describeBackupError(new AppError(AppErrorCode.CLOUD_BACKUP_NOT_SIGNED_IN), 'google-drive').title).toBe('Not signed in to Google Drive');
    expect(describeBackupError(new AppError(AppErrorCode.USER_REJECTED), 'google-drive').title).toBe('Not signed in to Google Drive');
    expect(describeBackupError(new AppError(AppErrorCode.CLOUD_BACKUP_QUOTA), 'icloud').title).toBe('iCloud storage is full');
    expect(describeBackupError(new AppError(AppErrorCode.NETWORK_ERROR), 'icloud').title).toBe('Can\'t reach iCloud');
    expect(describeBackupError(new AppError(AppErrorCode.STORAGE_ERROR, 'Disk error'), 'icloud')).toEqual({ title: 'Something went wrong', description: 'Disk error' });
  });

  it('describes a cloud copy changed elsewhere', () => {
    expect(describeRemoteChange('updatedElsewhere', 'icloud').title).toBe('Updated on another device');
    expect(describeRemoteChange('rolledBack', 'google-drive').description).toMatch(/older than the last one/);
    expect(describeRemoteChange('unreadable', 'icloud').title).toBe('Backup can\'t be read');
  });
});
