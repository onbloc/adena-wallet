import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

// iOS: app-private iCloud container (Documents). Android: Google Drive appDataFolder.
// Rejections carry CLOUD_BACKUP_ERROR codes. Only `signIn` may show UI.
export interface Spec extends TurboModule {
  // False without an iCloud account / iCloud Drive (iOS) or Google Play services (Android).
  isAvailable(): Promise<boolean>;
  // Android: asks for the drive.appdata scope. iOS: resolves at once.
  signIn(): Promise<void>;
  list(): Promise<Array<{ name: string; modifiedAt: number }>>;
  read(name: string): Promise<string>;
  // Replaces the whole file in one step; never leaves a partial file behind.
  write(name: string, contents: string): Promise<void>;
  // Resolves when the file is already gone.
  remove(name: string): Promise<void>;
}

export const CLOUD_BACKUP_ERROR = {
  UNAVAILABLE: 'E_UNAVAILABLE',
  NOT_SIGNED_IN: 'E_NOT_SIGNED_IN',
  CANCELED: 'E_CANCELED',
  QUOTA: 'E_QUOTA',
  NETWORK: 'E_NETWORK',
  NOT_FOUND: 'E_NOT_FOUND',
  FAILED: 'E_FAILED',
} as const;

export default TurboModuleRegistry.get<Spec>('AdenaCloudBackup');
