import { v4 as uuidv4 } from 'uuid';
import { Account, AccountInfo } from './account';
import { isLedgerKeyring, Keyring, KeyringType } from '../../wallet/keyring';
import { rawSecp256k1PubkeyToRawAddress } from '../../amino';
import { toBech32 } from '../../encoding';
import { GnoWallet } from '@gnolang/gno-js-client';

export class LedgerAccount implements Account {
  public readonly id;

  public readonly type: KeyringType;

  public readonly keyringId: string;

  public readonly hdPath: number;

  public readonly publicKey: Uint8Array;

  private _gnoWallet: GnoWallet | null = null; /* Temporarily added */

  private _index: number;

  private _name: string;

  constructor({ id, index, keyringId, type, publicKey, name, hdPath }: AccountInfo) {
    this.id = id || uuidv4();
    this._index = index;
    this.keyringId = keyringId;
    this.type = type;
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
    return toBech32(prefix, rawSecp256k1PubkeyToRawAddress(this.publicKey));
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

  public static async createBy(keyring: Keyring, name: string, hdPath: number) {
    if (!isLedgerKeyring(keyring)) {
      throw new Error('Invalid account type');
    }

    const publicKey = await keyring.getPublicKey(hdPath);
    const { id: keyringId, type } = keyring;
    return new LedgerAccount({
      keyringId,
      index: 1,
      type,
      publicKey: Array.from(publicKey),
      name,
      hdPath,
    });
  }

  public static fromData(accountInfo: AccountInfo) {
    return new LedgerAccount({
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
