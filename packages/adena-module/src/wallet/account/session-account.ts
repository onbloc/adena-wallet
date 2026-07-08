import { v4 as uuidv4 } from 'uuid';

import { publicKeyToAddress } from '../../utils/address';
import { Account, AccountInfo, SessionConfig } from './account';
import { SessionKeyring } from '../keyring/session-keyring';

export class SessionAccount implements Account {
  public readonly id: string;
  public readonly type = 'SESSION' as const;
  public readonly keyringId: string;
  public readonly publicKey: Uint8Array;
  public readonly sessionConfig: SessionConfig;

  private _index: number;
  private _name: string;

  constructor({ id, index, keyringId, publicKey, name, sessionConfig }: AccountInfo) {
    if (!sessionConfig) {
      throw new Error('SessionAccount requires sessionConfig');
    }
    this.id = id ?? uuidv4();
    this._index = index;
    this.keyringId = keyringId;
    this.publicKey = Uint8Array.from(publicKey);
    this._name = name;
    this.sessionConfig = sessionConfig;
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

  // Returns the session address — used internally for signing context.
  public getAddress(prefix: string): Promise<string> {
    return publicKeyToAddress(this.publicKey, prefix);
  }

  // Returns the master address — exposed to dApps and UI.
  public getMasterAddress(): string {
    return this.sessionConfig.masterAddress;
  }

  public toData(): AccountInfo {
    return {
      id: this.id,
      index: this._index,
      type: this.type,
      keyringId: this.keyringId,
      publicKey: Array.from(this.publicKey),
      name: this._name,
      sessionConfig: this.sessionConfig,
    };
  }

  public static createBy(
    keyring: SessionKeyring,
    name: string,
    sessionConfig: SessionConfig,
  ): SessionAccount {
    return new SessionAccount({
      index: 0,
      keyringId: keyring.id,
      type: 'SESSION',
      publicKey: Array.from(keyring.publicKey),
      name,
      sessionConfig,
    });
  }

  public static fromData(accountInfo: AccountInfo): SessionAccount {
    return new SessionAccount(accountInfo);
  }
}
