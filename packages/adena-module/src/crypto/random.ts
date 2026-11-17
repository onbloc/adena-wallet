import { getCryptoProvider } from './crypto-provider';

export class Random {
  /**
   * Returns `count` cryptographically secure random bytes
   */
  public static getBytes(count: number): Uint8Array {
    return getCryptoProvider().randomBytes(count);
  }
}
