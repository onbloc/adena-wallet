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
  public readonly index: number;
  public readonly type = 'MULTISIG' as const;
  public readonly name: string;
  public readonly keyringId: string;
  public readonly publicKey: Uint8Array;
  public readonly threshold: number;
  public readonly signerPublicKeys: Uint8Array[];

  constructor(accountInfo: AccountInfo) {
    this.id = accountInfo.id || uuidv4();
    this.index = accountInfo.index;
    this.name = accountInfo.name;
    this.keyringId = accountInfo.keyringId;
    this.publicKey = new Uint8Array(accountInfo.publicKey);
    this.threshold = accountInfo.threshold || 0;
    this.signerPublicKeys = (accountInfo.signerPublicKeys || []).map(
      (pubKey) => new Uint8Array(pubKey),
    );
  }

  toData(): AccountInfo {
    return {
      id: this.id,
      index: this.index,
      type: this.type,
      name: this.name,
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
  public static async createBy(
    keyring: MultisigKeyring,
    name: string,
    index: number,
  ): Promise<MultisigAccount> {
    return new MultisigAccount({
      index,
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
