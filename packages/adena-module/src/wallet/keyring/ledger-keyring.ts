import { LedgerConnector } from '@cosmjs/ledger-amino';
import {
  generateHDPath,
  Provider,
  TransactionEndpoint,
  Tx,
  Wallet as Tm2Wallet,
} from '@gnolang/tm2-js-client';
import { v4 as uuidv4 } from 'uuid';

import { Document, makeSignedTx, useTm2Wallet } from './../..';
import { Keyring, KeyringData, KeyringType, SignRawOptions } from './keyring';

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

  getPublicKey(hdPath: number) {
    if (!this.connector) {
      throw new Error('Ledger connector does not found');
    }
    const gnoHdPath = generateHDPath(hdPath);
    return this.connector.getPubkey(gnoHdPath);
  }

  toData() {
    return {
      id: this.id,
      type: this.type,
    };
  }

  async signRaw(_bytes: Uint8Array, _opts?: SignRawOptions): Promise<Uint8Array> {
    // Ledger hardware enforces "trust display": the device only signs documents
    // it can parse and render to the user. Raw opaque bytes would be blind
    // signing, which the device refuses. Phase 7 replaces this stub with a
    // device-friendly path (signAmino/signDirect) alongside Cosmos-app routing.
    throw new Error(
      `Ledger signRaw is not implemented yet (Phase 7) (keyring ${this.id})`,
    );
  }

  async sign(provider: Provider, document: Document, hdPath: number = 0) {
    if (!this.connector) {
      throw new Error('Ledger connector does not found');
    }
    const wallet = await useTm2Wallet(document).fromLedger(this.connector as any, {
      accountIndex: hdPath,
    });
    wallet.connect(provider);
    return this.signByWallet(wallet, document);
  }

  private async signByWallet(wallet: Tm2Wallet, document: Document) {
    const signedTx = await makeSignedTx(wallet, document);
    return {
      signed: signedTx,
      signature: signedTx.signatures,
    };
  }

  async broadcastTxSync(provider: Provider, signedTx: Tx, hdPath: number = 0) {
    if (!this.connector) {
      throw new Error('Ledger connector does not found');
    }
    const wallet = Tm2Wallet.fromLedger(this.connector, {
      accountIndex: hdPath,
    });
    wallet.connect(provider);
    return wallet.sendTransaction(signedTx, TransactionEndpoint.BROADCAST_TX_SYNC);
  }

  async broadcastTxCommit(provider: Provider, signedTx: Tx, hdPath: number = 0) {
    if (!this.connector) {
      throw new Error('Ledger connector does not found');
    }
    const wallet = Tm2Wallet.fromLedger(this.connector, {
      accountIndex: hdPath,
    });
    wallet.connect(provider);
    return wallet.sendTransaction(signedTx, TransactionEndpoint.BROADCAST_TX_COMMIT);
  }

  public static async fromLedger(connector: LedgerConnector) {
    const keyring = new LedgerKeyring({});
    keyring.setConnector(connector);
    return keyring;
  }
}
