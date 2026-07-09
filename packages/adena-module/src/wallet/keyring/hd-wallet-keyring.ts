import {
  Provider,
  TransactionEndpoint,
  Tx,
  TxSignature,
  Wallet as Tm2Wallet,
} from '@gnolang/tm2-js-client';
import sodium from 'libsodium-wrappers-sumo';
import { v4 as uuidv4 } from 'uuid';

import { Bip39, EnglishMnemonic, entropyToMnemonic, mnemonicToEntropy } from '../../crypto';
import { Document } from './../..';
import { generateKeyPairByHdPath, getAddressIndex, HdPathLike } from './hd-path';
import { Keyring, KeyringData, KeyringType, SignRawOptions } from './keyring';
import { signGnoDocument } from './sign-gno-document';
import { signRawWithPrivateKey } from './sign-raw-util';

export class HDWalletKeyring implements Keyring {
  public readonly id: string;
  public readonly type: KeyringType = 'HD_WALLET';
  public readonly seed: Uint8Array;
  public readonly mnemonicEntropy: Uint8Array;

  constructor({ id, mnemonicEntropy, seed }: KeyringData) {
    if (!mnemonicEntropy || !seed) {
      throw new Error('Invalid parameter values');
    }
    this.id = id || uuidv4();
    this.mnemonicEntropy = Uint8Array.from(mnemonicEntropy);
    this.seed = Uint8Array.from(seed);
  }

  getMnemonic() {
    return entropyToMnemonic(this.mnemonicEntropy);
  }

  async getKeypair(hdPath: HdPathLike) {
    const { privateKey, publicKey } = await generateKeyPairByHdPath(this.getMnemonic(), hdPath);
    return { privateKey, publicKey: publicKey };
  }

  async getPrivateKey(hdPath: HdPathLike) {
    const { privateKey } = await this.getKeypair(hdPath);
    return privateKey;
  }

  async getPublicKey(hdPath: HdPathLike) {
    const { publicKey } = await this.getKeypair(hdPath);
    return publicKey;
  }

  destroy() {
    sodium.memzero(this.seed);
    sodium.memzero(this.mnemonicEntropy);
  }

  toData() {
    return {
      id: this.id,
      type: this.type,
      seed: Array.from(this.seed),
      mnemonicEntropy: Array.from(this.mnemonicEntropy),
    };
  }

  async signRaw(bytes: Uint8Array, opts?: SignRawOptions): Promise<Uint8Array> {
    const hdPath: HdPathLike = opts?.hdPath ?? 0;
    const privateKey = await this.getPrivateKey(hdPath);
    try {
      return await signRawWithPrivateKey(bytes, privateKey);
    } finally {
      // Wipe the per-call derived private key from memory; the long-lived
      // seed/entropy can re-derive it on the next call.
      sodium.memzero(privateKey);
    }
  }

  async sign(
    provider: Provider,
    document: Document,
    hdPath: HdPathLike = 0,
  ): Promise<{
    signed: Tx;
    signature: TxSignature[];
  }> {
    return signGnoDocument(provider, document, this, { hdPath });
  }

  async broadcastTxSync(provider: Provider, signedTx: Tx, hdPath: HdPathLike = 0) {
    // Broadcasting an already-signed tx does not use the derived key; only the
    // provider connection matters. accountIndex is passed for parity but is inert.
    const wallet = await Tm2Wallet.fromMnemonic(this.getMnemonic(), {
      accountIndex: getAddressIndex(hdPath),
    });
    wallet.connect(provider);
    return wallet.sendTransaction(signedTx, TransactionEndpoint.BROADCAST_TX_SYNC);
  }

  async broadcastTxCommit(provider: Provider, signedTx: Tx, hdPath: HdPathLike = 0) {
    const wallet = await Tm2Wallet.fromMnemonic(this.getMnemonic(), {
      accountIndex: getAddressIndex(hdPath),
    });
    wallet.connect(provider);
    return wallet.sendTransaction(signedTx, TransactionEndpoint.BROADCAST_TX_COMMIT);
  }

  public static async fromMnemonic(mnemonic: string) {
    const englishMnemonic = new EnglishMnemonic(mnemonic);
    const seed = await Bip39.mnemonicToSeed(englishMnemonic);
    const mnemonicEntropy = await mnemonicToEntropy(englishMnemonic.toString());
    return new HDWalletKeyring({
      mnemonicEntropy: Array.from(mnemonicEntropy),
      seed: Array.from(seed),
    });
  }
}
