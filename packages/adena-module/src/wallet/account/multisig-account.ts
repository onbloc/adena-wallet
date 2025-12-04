import { defaultAddressPrefix } from '@gnolang/tm2-js-client';
import { v4 as uuidv4 } from 'uuid';

import { publicKeyToAddress } from './../../utils/address';
import { MultisigKeyring } from '../keyring/multisig-keyring';
import { Account, AccountInfo } from './account';

/**
 * MultisigAccount class
 * Represents a multisig account with threshold signature requirement
 */
export class MultisigAccount implements Account {
  public readonly id: string;
  public readonly type = 'MULTISIG' as const;
  public readonly keyringId: string;
  public readonly publicKey: Uint8Array;
  public readonly threshold: number;
  public readonly signerPublicKeys: Uint8Array[];

  private _index: number;
  private _name: string;

  constructor(accountInfo: AccountInfo) {
    this.id = accountInfo.id || uuidv4();
    this._index = accountInfo.index;
    this._name = accountInfo.name;
    this.keyringId = accountInfo.keyringId;
    this.publicKey = new Uint8Array(accountInfo.publicKey);
    this.threshold = accountInfo.threshold || 0;
    this.signerPublicKeys = (accountInfo.signerPublicKeys || []).map(
      (pubKey) => new Uint8Array(pubKey),
    );
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

  toData(): AccountInfo {
    return {
      id: this.id,
      index: this._index,
      type: this.type,
      name: this._name,
      keyringId: this.keyringId,
      publicKey: Array.from(this.publicKey),
      threshold: this.threshold,
      signerPublicKeys: this.signerPublicKeys.map((pubKey) => Array.from(pubKey)),
    };
  }

  async getAddress(prefix: string = defaultAddressPrefix): Promise<string> {
    return publicKeyToAddress(this.publicKey, prefix);
  }

  /**
   * Create a MultisigAccount from a keyring
   */
  public static async createBy(keyring: MultisigKeyring, name: string): Promise<MultisigAccount> {
    return new MultisigAccount({
      index: 1,
      type: 'MULTISIG',
      name,
      keyringId: keyring.id,
      publicKey: Array.from(keyring.publicKey),
      threshold: keyring.threshold,
      signerPublicKeys: keyring.signerPublicKeys.map((pubKey) => Array.from(pubKey)),
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
