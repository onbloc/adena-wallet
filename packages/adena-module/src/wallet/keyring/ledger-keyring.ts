import { LedgerConnector } from '@cosmjs/ledger-amino';
import { Provider, TransactionEndpoint, Tx, Wallet as Tm2Wallet } from '@gnolang/tm2-js-client';
import { v4 as uuidv4 } from 'uuid';

import { classifyLedgerError, LedgerError } from '../../ledger/ledger-errors';
import { Document, makeSignedTx } from './../..';
import { getAddressIndex, HdPathLike, toSlip10Path } from './hd-path';
import { Keyring, KeyringData, KeyringType, SignRawOptions } from './keyring';
import { FullPathLedgerSigner } from './ledger-signer';

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

  getPublicKey(hdPath: HdPathLike) {
    if (!this.connector) {
      throw new Error('Ledger connector does not found');
    }
    const gnoHdPath = toSlip10Path(hdPath);
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
    const hdPath = toSlip10Path(opts?.hdPath ?? 0);
    try {
      return await this.connector.sign(bytes, hdPath);
    } catch (err) {
      throw classifyLedgerError(err);
    }
  }

  async sign(provider: Provider, document: Document, hdPath: HdPathLike = 0) {
    if (!this.connector) {
      throw new Error('Ledger connector does not found');
    }
    // tm2's Wallet.fromLedger only accepts an address index (account'/change fixed
    // to 0). Inject a full-path signer via Wallet.fromSigner so the device can sign
    // at any Adena path, keeping tm2's exact byte pipeline.
    const signer = new FullPathLedgerSigner(this.connector, hdPath);
    const wallet = await Tm2Wallet.fromSigner(signer);
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

  async broadcastTxSync(provider: Provider, signedTx: Tx, hdPath: HdPathLike = 0) {
    if (!this.connector) {
      throw new Error('Ledger connector does not found');
    }
    // Broadcasting an already-signed tx does not derive a key; accountIndex is inert.
    const wallet = Tm2Wallet.fromLedger(this.connector, {
      accountIndex: getAddressIndex(hdPath),
    });
    wallet.connect(provider);
    return wallet.sendTransaction(signedTx, TransactionEndpoint.BROADCAST_TX_SYNC);
  }

  async broadcastTxCommit(provider: Provider, signedTx: Tx, hdPath: HdPathLike = 0) {
    if (!this.connector) {
      throw new Error('Ledger connector does not found');
    }
    const wallet = Tm2Wallet.fromLedger(this.connector, {
      accountIndex: getAddressIndex(hdPath),
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
