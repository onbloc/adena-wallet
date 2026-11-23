import { KeyringRecord } from '../crypto/keyring';
import { DataMigration } from './migration-runner';

export interface VaultContentV1 {
  keyrings: KeyringRecord[];
}

export type VaultContent = VaultContentV1;

// Decrypted vault content migrations, applied on unlock and re-encrypted immediately.
export const VAULT_MIGRATIONS: DataMigration[] = [
  {
    version: 1,
    up: data => data,
  },
];

export const VAULT_CONTENT_VERSION = 1;
