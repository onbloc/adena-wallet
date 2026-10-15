import type {BackgroundMessenger} from '@common/platform/background-messenger';
import type {CommandMessageData} from '@inject/message/command-message';
import {
  fromBase64UrlNoPadding,
  getCryptoProvider,
  toBase64UrlNoPadding,
  xchacha20NonceLength,
} from 'adena-module';

export interface InProcessMessengerOptions {
  /** Restarts the auto-lock timer (activity ping or a changed setting). */
  resetAutoLock: () => Promise<void>;
  /** Locks the wallet: stops auto-lock and dismisses pending approvals. */
  onClear: () => Promise<void>;
}

const KEY_LENGTH = 32;

/**
 * Mobile `BackgroundMessenger`. The extension sends these commands to its
 * service worker; on mobile there is no second process, so they are handled
 * here, in the same JS runtime.
 *
 * The session password is sealed with a random key that exists only in this
 * object's memory (XChaCha20-Poly1305 via the registered CryptoProvider),
 * mirroring the extension, where the key lives in the service worker. Locking
 * zeroes the key, which makes the stored session ciphertext useless.
 */
export class InProcessMessenger implements BackgroundMessenger {
  private sessionKey: Uint8Array | null = null;

  private readonly listeners = new Set<(message: unknown) => void>();

  constructor(private readonly options: InProcessMessengerOptions) {}

  sendCommand = async <T = any>(
    message: CommandMessageData,
  ): Promise<CommandMessageData<T> | null> => {
    try {
      switch (message.command) {
        case 'encryptPassword':
          if (!message.data?.password) {
            throw new Error('Password is required');
          }
          return this.reply(message, await this.seal(message.data.password));
        case 'decryptPassword':
          return this.reply(message, {
            password: await this.open(
              message.data?.iv,
              message.data?.encryptedPassword,
            ),
          });
        case 'clearEncryptKey':
          this.clearSessionKey();
          return this.reply(message, null);
        case 'resetAutoLockTimer':
        case 'updateAutoLockTimer':
          await this.options.resetAutoLock();
          return this.reply(message, null);
        case 'clearPopup':
          this.clearSessionKey();
          await this.options.onClear();
          return this.reply(message, null);
        default:
          return {...message, code: 500, data: null} as CommandMessageData<T>;
      }
    } catch {
      return {...message, code: 500, data: null} as CommandMessageData<T>;
    }
  };

  broadcast = async (message: unknown): Promise<void> => {
    this.listeners.forEach(listener => listener(message));
  };

  onBroadcast(listener: (message: unknown) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Opens the sealed session password for the shared dApp handlers
   * (registered as their SessionPasswordReader). Throws when locked.
   */
  readSessionPassword = (
    nonce: string,
    sealedPassword: string,
  ): Promise<string> => this.open(nonce, sealedPassword);

  clearSessionKey(): void {
    if (this.sessionKey) {
      getCryptoProvider().memzero(this.sessionKey);
      this.sessionKey = null;
    }
  }

  private reply<T>(
    message: CommandMessageData,
    data: unknown,
  ): CommandMessageData<T> {
    return {...message, code: 200, data} as CommandMessageData<T>;
  }

  private getSessionKey(): Uint8Array {
    if (!this.sessionKey) {
      this.sessionKey = getCryptoProvider().randomBytes(KEY_LENGTH);
    }
    return this.sessionKey;
  }

  private async seal(
    password: string,
  ): Promise<{encryptedKey: string; encryptedPassword: string}> {
    const crypto = getCryptoProvider();
    const nonce = crypto.randomBytes(xchacha20NonceLength);
    const plain = new TextEncoder().encode(password);
    try {
      const sealed = await crypto.xchacha20poly1305Encrypt(
        plain,
        this.getSessionKey(),
        nonce,
      );
      return {
        encryptedKey: toBase64UrlNoPadding(nonce),
        encryptedPassword: toBase64UrlNoPadding(sealed),
      };
    } finally {
      crypto.memzero(plain);
    }
  }

  private async open(nonce: unknown, sealed: unknown): Promise<string> {
    if (
      !this.sessionKey ||
      typeof nonce !== 'string' ||
      typeof sealed !== 'string'
    ) {
      throw new Error('No session');
    }
    const plain = await getCryptoProvider().xchacha20poly1305Decrypt(
      fromBase64UrlNoPadding(sealed),
      this.sessionKey,
      fromBase64UrlNoPadding(nonce),
    );
    return new TextDecoder().decode(plain);
  }
}
