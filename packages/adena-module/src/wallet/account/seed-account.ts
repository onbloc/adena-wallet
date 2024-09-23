import { v4 as uuidv4 } from 'uuid';

import { publicKeyToAddress } from '../../utils/address';
import { isHDWalletKeyring, Keyring, KeyringType } from '../../wallet/keyring';
import { Wallet } from '../wallet';
import { Account, AccountInfo } from './account';

export class SeedAccount implements Account {
  public readonly id;

  public readonly type: KeyringType;

  public readonly keyringId: string;

  public readonly hdPath: number;

  public readonly publicKey: Uint8Array;

  private _index: number;

  private _name: string;

  constructor({ id, index, keyringId, publicKey, type, name, hdPath }: AccountInfo) {
    this.id = id ?? uuidv4();
    this._index = index;
    this.type = type;
    this.keyringId = keyringId;
    this.hdPath = hdPath ?? 0;
    this.publicKey = Uint8Array.from(publicKey);
    this._name = name;
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

  public getAddress(prefix: string) {
    return publicKeyToAddress(this.publicKey, prefix);
  }
  public toData() {
    return {
      id: this.id,
      index: this._index,
      type: this.type,
      keyringId: this.keyringId,
      hdPath: this.hdPath,
      publicKey: Array.from(this.publicKey),
      name: this._name,
    };
  }

  public static async createBy(keyring: Keyring, name: string, hdPath: number, index = 1) {
    if (!isHDWalletKeyring(keyring)) {
      throw new Error('Invalid account type');
    }
    const publicKey = await keyring.getPublicKey(hdPath);

    const { id: keyringId, type: type } = keyring;
    return new SeedAccount({
      keyringId,
      index,
      type,
      publicKey: Array.from(publicKey),
      name,
      hdPath,
    });
  }

  public static async createByWallet(wallet: Wallet) {
    if (!wallet.currentKeyring || !isHDWalletKeyring(wallet.currentKeyring)) {
      throw new Error('The current keyring is not an HD Wallet Keyring');
    }
    const hdPath = wallet.getNextHDPathBy(wallet.currentKeyring);
    return this.createBy(wallet.currentKeyring, wallet.nextAccountName, hdPath);
  }

  public static fromData(accountInfo: AccountInfo) {
    return new SeedAccount({
      id: accountInfo.id,
      index: accountInfo.index,
      type: accountInfo.type,
      keyringId: accountInfo.keyringId,
      hdPath: accountInfo.hdPath,
      publicKey: accountInfo.publicKey,
      name: accountInfo.name,
    });
  }
}
