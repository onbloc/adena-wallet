import { v4 as uuidv4 } from 'uuid';
import { Account, AccountInfo } from './account';
import { isAddressKeyring, Keyring, KeyringType } from '../keyring';
import { toBech32 } from '../../encoding';

export class AirgapAccount implements Account {
  public readonly id;

  public readonly type: KeyringType;

  public readonly keyringId: string;

  public readonly publicKey: Uint8Array;

  public readonly addressBytes: Uint8Array;

  private _index: number;

  private _name: string;

  constructor({ id, index, type, keyringId, addressBytes, name }: AccountInfo) {
    this.id = id ?? uuidv4();
    this._index = index;
    this.type = type;
    this.keyringId = keyringId;
    this.publicKey = new Uint8Array();
    this.addressBytes = Uint8Array.from(addressBytes ?? []);
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

  public async getAddress(prefix: string) {
    return toBech32(prefix, this.addressBytes);
  }

  public toData() {
    return {
      id: this.id,
      index: this._index,
      type: this.type,
      keyringId: this.keyringId,
      publicKey: Array.from(this.publicKey),
      addressBytes: Array.from(this.addressBytes),
      name: this._name,
      hdPath: undefined,
    };
  }

  public static async createBy(keyring: Keyring, name: string) {
    if (!isAddressKeyring(keyring)) {
      throw new Error('Invalid account type');
    }

    const { id: keyringId, type: type, addressBytes } = keyring;
    return new AirgapAccount({
      keyringId,
      index: 1,
      type,
      publicKey: [],
      addressBytes: Array.from(addressBytes),
      name,
    });
  }

  public static fromData(accountInfo: AccountInfo) {
    return new AirgapAccount({
      id: accountInfo.id,
      index: accountInfo.index,
      type: accountInfo.type,
      keyringId: accountInfo.keyringId,
      publicKey: accountInfo.publicKey,
      name: accountInfo.name,
      addressBytes: accountInfo.addressBytes,
    });
  }
}
