import {
  generateKeyPair,
  Provider,
  TransactionEndpoint,
  Tx,
  TxSignature,
  Wallet as Tm2Wallet,
} from '@gnolang/tm2-js-client';
import { v4 as uuidv4 } from 'uuid';

import { Bip39, EnglishMnemonic } from '../../crypto';
import { Document, makeSignedTx, useTm2Wallet } from './../..';
import { Keyring, KeyringData, KeyringType } from './keyring';

export class HDWalletKeyring implements Keyring {
  public readonly id: string;
  public readonly type: KeyringType = 'HD_WALLET';
  public readonly seed: Uint8Array;
  public readonly mnemonic: string;

  constructor({ id, mnemonic, seed }: KeyringData) {
    if (!mnemonic || !seed) {
      throw new Error('Invalid parameter values');
    }
    this.id = id || uuidv4();
    this.mnemonic = mnemonic;
    this.seed = Uint8Array.from(seed);
  }

  async getKeypair(hdPath: number) {
    const { privateKey, publicKey } = await generateKeyPair(this.mnemonic, hdPath);
    return { privateKey, publicKey: publicKey };
  }

  async getPrivateKey(hdPath: number) {
    const { privateKey } = await this.getKeypair(hdPath);
    return privateKey;
  }

  async getPublicKey(hdPath: number) {
    const { publicKey } = await this.getKeypair(hdPath);
    return publicKey;
  }

  toData() {
    return {
      id: this.id,
      type: this.type,
      seed: Array.from(this.seed),
      mnemonic: this.mnemonic,
    };
  }

  async sign(
    provider: Provider,
    document: Document,
    hdPath: number = 0,
  ): Promise<{
    signed: Tx;
    signature: TxSignature[];
  }> {
    const wallet = await useTm2Wallet(document).fromMnemonic(this.mnemonic, {
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
    const wallet = await Tm2Wallet.fromMnemonic(this.mnemonic, { accountIndex: hdPath });
    wallet.connect(provider);
    return wallet.sendTransaction(signedTx, TransactionEndpoint.BROADCAST_TX_SYNC);
  }

  async broadcastTxCommit(provider: Provider, signedTx: Tx, hdPath: number = 0) {
    const wallet = await Tm2Wallet.fromMnemonic(this.mnemonic, { accountIndex: hdPath });
    wallet.connect(provider);
    return wallet.sendTransaction(signedTx, TransactionEndpoint.BROADCAST_TX_COMMIT);
  }

  public static async fromMnemonic(mnemonic: string) {
    const englishMnemonic = new EnglishMnemonic(mnemonic);
    const seed = await Bip39.mnemonicToSeed(englishMnemonic);
    return new HDWalletKeyring({ mnemonic, seed: Array.from(seed) });
  }
}
