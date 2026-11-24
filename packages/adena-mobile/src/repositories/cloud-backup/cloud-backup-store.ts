export const CloudBackupProvider = {
  ICLOUD: 'icloud',
  GOOGLE_DRIVE: 'google-drive',
} as const;

export type CloudBackupProvider = (typeof CloudBackupProvider)[keyof typeof CloudBackupProvider];

export interface CloudBackupFile {
  name: string;
  // Epoch milliseconds as reported by the provider.
  modifiedAt: number;
}

// App-private cloud file storage. Failures are AppErrors: CLOUD_BACKUP_UNAVAILABLE, CLOUD_BACKUP_NOT_SIGNED_IN,
// CLOUD_BACKUP_QUOTA, NETWORK_ERROR, BACKUP_NOT_FOUND, USER_REJECTED or STORAGE_ERROR.
export interface CloudBackupStore {
  readonly provider: CloudBackupProvider;
  isAvailable(): Promise<boolean>;
  // Interactive consent where the provider needs one (Google Drive); a no-op on iCloud.
  signIn(): Promise<void>;
  list(): Promise<CloudBackupFile[]>;
  read(name: string): Promise<string>;
  // Replaces the file in one step and verifies the stored copy.
  write(name: string, contents: string): Promise<void>;
  // Succeeds when the file is already gone.
  remove(name: string): Promise<void>;
}

export const BACKUP_FILE_PATTERN = /^adena-backup-[0-9a-f]{32}\.json$/;

export const backupFileName = (backupId: string): string => `adena-backup-${backupId}.json`;
