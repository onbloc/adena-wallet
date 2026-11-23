import { AppError, AppErrorCode } from '../core/errors';
import { KeyPair, wipeKeyPair } from '../crypto/key-pair';
import { HDKeyring, Keyring, keyringFromRecord, KeyringRecord } from '../crypto/keyring';

// Holds decrypted keyrings in memory while the wallet is unlocked.
export class KeyringSession {
  private keyrings = new Map<string, Keyring>();
  private unlocked = false;

  isUnlocked(): boolean {
    return this.unlocked;
  }

  open(records: KeyringRecord[]): void {
    this.close();
    records.forEach(record => this.keyrings.set(record.id, keyringFromRecord(record)));
    this.unlocked = true;
  }

  add(record: KeyringRecord): void {
    this.assertUnlocked();
    this.keyrings.set(record.id, keyringFromRecord(record));
  }

  close(): void {
    this.keyrings.forEach(keyring => keyring.destroy());
    this.keyrings.clear();
    this.unlocked = false;
  }

  getMnemonic(keyringId: string): string {
    const keyring = this.getKeyring(keyringId);

    if (!(keyring instanceof HDKeyring)) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'Keyring has no recovery phrase');
    }

    return keyring.getMnemonic();
  }

  // The private key is wiped as soon as the callback settles.
  async withKeyPair<T>(keyringId: string, hdIndex: number, task: (keyPair: KeyPair) => Promise<T>): Promise<T> {
    const keyPair = await this.getKeyring(keyringId).deriveKeyPair(hdIndex);

    try {
      return await task(keyPair);
    }
    finally {
      wipeKeyPair(keyPair);
    }
  }

  private getKeyring(keyringId: string): Keyring {
    this.assertUnlocked();
    const keyring = this.keyrings.get(keyringId);

    if (!keyring) {
      throw new AppError(AppErrorCode.WALLET_NOT_FOUND, `Keyring ${keyringId} is not loaded`);
    }

    return keyring;
  }

  private assertUnlocked(): void {
    if (!this.unlocked) {
      throw new AppError(AppErrorCode.WALLET_LOCKED, 'Wallet is locked');
    }
  }
}
