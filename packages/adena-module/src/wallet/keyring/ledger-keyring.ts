import { v4 as uuidv4 } from 'uuid';
import { Provider, TransactionEndpoint, Wallet as Tm2Wallet } from '@gnolang/tm2-js-client';
import { Keyring, KeyringData, KeyringType } from './keyring';
import { generateHDPath, Tx } from '@gnolang/tm2-js-client';
import { LedgerConnector } from '@cosmjs/ledger-amino';
import { Document, useTm2Wallet, makeSignedTx } from './../..';

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
