import { defaultAddressPrefix } from '@gnolang/tm2-js-client';
import { v4 as uuidv4 } from 'uuid';

import { toBech32 } from '../../encoding';
import { MultisigKeyring } from '../keyring/multisig-keyring';
import { Account, AccountInfo } from './account';

/**
 * MultisigAccount class
 * Represents a multisig account with threshold signature requirement
 *
 * Note: Similar to AirgapAccount, this stores the address bytes directly
 * instead of deriving it from a public key to avoid compression issues
 * with threshold multisig public keys.
 */
export class MultisigAccount implements Account {
  public readonly id: string;
  public readonly type = 'MULTISIG' as const;
  public readonly keyringId: string;
  public readonly publicKey: Uint8Array; // ✅ Always empty (not used)
  public readonly addressBytes: Uint8Array; // ✅ Like AirgapAccount
  public readonly threshold: number;

  private _index: number;
  private _name: string;

  constructor(accountInfo: AccountInfo) {
    this.id = accountInfo.id || uuidv4();
    this._index = accountInfo.index;
    this._name = accountInfo.name;
    this.keyringId = accountInfo.keyringId;
    this.publicKey = new Uint8Array(); // ✅ Empty like AirgapAccount
    this.addressBytes = Uint8Array.from(accountInfo.addressBytes ?? []); // ✅ Like AirgapAccount
    this.threshold = accountInfo.threshold || 0;
  }

  public get index() {
    return this._index;
  }

  public set index(_index: number) {
    this._index = _index;
  }

  public get name() {
    return this._name;
  }

  public set name(_name: string) {
    this._name = _name;
  }

  /**
   * Serialize account data for storage
   */
  toData(): AccountInfo {
    return {
      id: this.id,
      index: this._index,
      type: this.type,
      name: this._name,
      keyringId: this.keyringId,
      publicKey: Array.from(this.publicKey), // Empty array
      addressBytes: Array.from(this.addressBytes), // ✅ Like AirgapAccount
      threshold: this.threshold,
      hdPath: undefined,
    };
  }

  /**
   * Get the multisig address
   * Converts addressBytes to bech32 format (like AirgapAccount)
   */
  async getAddress(prefix: string = defaultAddressPrefix): Promise<string> {
    return toBech32(prefix, this.addressBytes); // ✅ Like AirgapAccount
  }

  /**
   * Create a MultisigAccount from a keyring
   *
   * @param keyring - MultisigKeyring instance
   * @param name - Account name
   * @param addressBytes - Multisig address bytes (20 bytes)
   */
  public static async createBy(
    keyring: MultisigKeyring,
    name: string,
    addressBytes: Uint8Array,
  ): Promise<MultisigAccount> {
    return new MultisigAccount({
      index: 1,
      type: 'MULTISIG',
      name,
      keyringId: keyring.id,
      publicKey: [],
      addressBytes: Array.from(addressBytes),
      threshold: keyring.threshold,
    });
  }

  /**
   * Create from saved data
   */
  public static fromData(accountInfo: AccountInfo): MultisigAccount {
    return new MultisigAccount(accountInfo);
  }
}

/**
 * Type guard to check if an account is a MultisigAccount
 */
export function isMultisigAccount(account: Account): account is MultisigAccount {
  return account.type === 'MULTISIG';
}
