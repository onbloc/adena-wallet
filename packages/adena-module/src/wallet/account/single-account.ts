import { v4 as uuidv4 } from 'uuid';
import { Account, AccountInfo } from './account';
import { isPrivateKeyKeyring, isWeb3AuthKeyring, Keyring, KeyringType } from '../keyring';
import { toBech32 } from '../../encoding';
import { rawSecp256k1PubkeyToRawAddress } from '../../amino';

export class SingleAccount implements Account {
  public readonly id;

  public readonly type: KeyringType;

  public readonly keyringId: string;

  public readonly publicKey: Uint8Array;

  private _index: number;

  private _name: string;

  constructor({ id, index, type, keyringId, publicKey, name }: AccountInfo) {
    this.id = id ?? uuidv4();
    this._index = index;
    this.type = type;
    this.keyringId = keyringId;
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
    return toBech32(prefix, rawSecp256k1PubkeyToRawAddress(this.publicKey));
  }

  public toData() {
    return {
      id: this.id,
      index: this._index,
      type: this.type,
      keyringId: this.keyringId,
      publicKey: Array.from(this.publicKey),
      name: this._name,
      hdPath: undefined,
    };
  }

  public static async createBy(keyring: Keyring, name: string) {
    if (!isPrivateKeyKeyring(keyring) && !isWeb3AuthKeyring(keyring)) {
      throw new Error('Invalid account type');
    }

    const { id: keyringId, type: type, publicKey } = keyring;
    return new SingleAccount({
      keyringId,
      index: 0,
      type,
      publicKey: Array.from(publicKey),
      name,
    });
  }

  public static fromData(accountInfo: AccountInfo) {
    return new SingleAccount({
      id: accountInfo.id,
      index: accountInfo.index,
      type: accountInfo.type,
      keyringId: accountInfo.keyringId,
      publicKey: accountInfo.publicKey,
      name: accountInfo.name,
    });
  }
}
