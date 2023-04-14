import { v4 as uuidv4 } from 'uuid';
import { Keyring, KeyringData, KeyringType } from './keyring';
import { LedgerConnector, StdSignDoc, encodeSecp256k1Signature } from '../../amino';
import { makeGnolandPath } from '../../amino/paths';
import { serializeSignToGnoDoc } from '../../amino/secp256k1hdwallet';

export class LedgerKeyring implements Keyring {
  public readonly id: string;
  public readonly type: KeyringType = 'LEDGER';
  private connector: LedgerConnector | null;

  constructor({ id }: KeyringData) {
    this.id = id || uuidv4();
    this.connector = null;
  }

  setConnector(connector: LedgerConnector) {
    this.connector = connector;
  }

  toData() {
    return {
      id: this.id,
      type: this.type,
    };
  }

  async sign(document: StdSignDoc, hdPath: number = 0) {
    if (!this.connector) {
      throw new Error('Ledger connector does not found');
    }
    const message = serializeSignToGnoDoc(document);
    const gnoHdPath = makeGnolandPath(hdPath);
    const publicKey = await this.connector.getPubkey(gnoHdPath);
    const signature = await this.connector.sign(message, gnoHdPath);
    return {
      signed: document,
      signature: encodeSecp256k1Signature(publicKey, signature),
    };
  }

  public static async fromLedger(connector: LedgerConnector) {
    const keyring = new LedgerKeyring({});
    keyring.setConnector(connector);
    return keyring;
  }
}
