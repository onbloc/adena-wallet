import { SecureStore } from '../security/secure-store';
import { MigrationStep } from './migration-runner';

// Keychain-level changes (item renames, access policy changes). Vault content has its own steps.
export const SECURE_MIGRATIONS: MigrationStep<SecureStore>[] = [
  {
    version: 1,
    description: 'Initial secure storage schema',
    up: (): void => {},
  },
];
