import { SecureKey } from '../security/secure-keys';
import { SecureStore } from '../security/secure-store';
import { EncryptedPayload } from '../security/vault-cipher';

// contentVersion tracks the decrypted content schema (see vault-migrations).
export interface VaultRecord {
  contentVersion: number;
  payload: EncryptedPayload;
}

export interface VaultRepository {
  exists(): Promise<boolean>;
  read(): Promise<VaultRecord | null>;
  write(record: VaultRecord): Promise<void>;
  clear(): Promise<void>;
}

export class SecureVaultRepository implements VaultRepository {
  constructor(private readonly secureStore: SecureStore) {}

  exists(): Promise<boolean> {
    return this.secureStore.hasItem(SecureKey.VAULT);
  }

  async read(): Promise<VaultRecord | null> {
    const raw = await this.secureStore.getItem(SecureKey.VAULT);

    return raw ? (JSON.parse(raw) as VaultRecord) : null;
  }

  write(record: VaultRecord): Promise<void> {
    return this.secureStore.setItem(SecureKey.VAULT, JSON.stringify(record));
  }

  clear(): Promise<void> {
    return this.secureStore.removeItem(SecureKey.VAULT);
  }
}
