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

interface VaultCopy {
  seq: number;
  record: VaultRecord;
}

const COPIES = [SecureKey.VAULT_STAGING, SecureKey.VAULT] as const;

// Keychain replaces an item by delete-then-add, so the vault is kept in two items written in
// turn (staging, then primary). Each holds a sequence number and the newest complete copy wins.
export class SecureVaultRepository implements VaultRepository {
  constructor(private readonly secureStore: SecureStore) {}

  async exists(): Promise<boolean> {
    return (await this.latest()) !== null;
  }

  async read(): Promise<VaultRecord | null> {
    return (await this.latest())?.record ?? null;
  }

  async write(record: VaultRecord): Promise<void> {
    const seq = ((await this.latest())?.seq ?? 0) + 1;

    await this.secureStore.setItem(SecureKey.VAULT_STAGING, JSON.stringify({ seq, record }));
    // The primary gets the same record with a higher number; the old secrets survive nowhere.
    await this.secureStore.setItem(SecureKey.VAULT, JSON.stringify({ seq: seq + 1, record }));
  }

  async clear(): Promise<void> {
    await this.secureStore.removeItem(SecureKey.VAULT);
    await this.secureStore.removeItem(SecureKey.VAULT_STAGING);
  }

  // Corrupt data is surfaced rather than silently replaced by the other copy.
  private async latest(): Promise<VaultCopy | null> {
    let latest: VaultCopy | null = null;

    for (const key of COPIES) {
      const raw = await this.secureStore.getItem(key);

      if (raw) {
        const copy = JSON.parse(raw) as VaultCopy;

        if (!latest || copy.seq > latest.seq) {
          latest = copy;
        }
      }
    }

    return latest;
  }
}
