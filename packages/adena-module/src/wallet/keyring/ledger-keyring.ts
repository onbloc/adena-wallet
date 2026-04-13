import { LedgerConnector } from '@cosmjs/ledger-amino';
import {
  generateHDPath,
  Provider,
  TransactionEndpoint,
  Tx,
  Wallet as Tm2Wallet,
} from '@gnolang/tm2-js-client';
import { v4 as uuidv4 } from 'uuid';

import { LedgerError, classifyLedgerError } from '../../ledger/ledger-errors';
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

  destroy() {
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

  async signRaw(bytes: Uint8Array, opts?: SignRawOptions): Promise<Uint8Array> {
    // Cosmos AMINO path: the device signs the UTF-8 JSON sign doc that cosmjs
    // forwards verbatim to the Ledger Cosmos app. @cosmjs/ledger-amino's
    // connector.sign() handles the DER → 64-byte r||s conversion and the
    // verifyCosmosAppIsOpen pre-flight check internally.
    if (!this.connector) {
      throw new LedgerError('TransportFailed', 'Ledger connector is not attached');
    }
    const hdPath = generateHDPath(opts?.hdPath ?? 0);
    try {
      return await this.connector.sign(bytes, hdPath);
    } catch (err) {
      throw classifyLedgerError(err);
    }
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
