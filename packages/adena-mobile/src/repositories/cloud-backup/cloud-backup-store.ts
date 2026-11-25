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
  // Creates the file in one step and verifies the stored copy; never replaces an existing file.
  write(name: string, contents: string): Promise<void>;
  // Succeeds when the file is already gone.
  remove(name: string): Promise<void>;
}

// `adena-backup-<id>.json` (single file, older apps) or `adena-backup-<id>.<revision>-<nonce>.json`: one immutable
// file per write, so two devices writing the same revision both keep their copy.
export const BACKUP_FILE_PATTERN = /^adena-backup-([0-9a-f]{32})(?:\.(0|[1-9][0-9]{0,14})-([0-9a-f]{16}))?\.json$/;

export const backupFileName = (backupId: string): string => `adena-backup-${backupId}.json`;

export const backupVersionFileName = (backupId: string, revision: number, nonce: string): string =>
  `adena-backup-${backupId}.${revision}-${nonce}.json`;

export interface BackupFileNameParts {
  backupId: string;
  // Null for the single-file format, whose revision is only in the header.
  revision: number | null;
}

export const parseBackupFileName = (name: string): BackupFileNameParts | null => {
  const match = BACKUP_FILE_PATTERN.exec(name);

  return match ? { backupId: match[1], revision: match[2] === undefined ? null : Number(match[2]) } : null;
};

// Whether two file names hold versions of the same backup.
export const isSameBackup = (a: string | undefined, b: string | undefined): boolean => {
  const left = a === undefined ? null : parseBackupFileName(a);

  return left !== null && b !== undefined && left.backupId === parseBackupFileName(b)?.backupId;
};
