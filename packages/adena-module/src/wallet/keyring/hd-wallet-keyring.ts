import {
  Provider,
  TransactionEndpoint,
  Tx,
  TxSignature,
  uint8ArrayToBase64,
} from '@gnolang/tm2-js-client';
import { v4 as uuidv4 } from 'uuid';

import { getCryptoProvider } from '../../crypto/crypto-provider';

import { Bip39, EnglishMnemonic, entropyToMnemonic, mnemonicToEntropy } from '../../crypto';
import { Document } from './../..';
import { generateKeyPairFromSeed, HdPathLike } from './hd-path';
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

  // `seed` is the mnemonic's BIP39 seed (see fromMnemonic), so this yields the
  // keys generateKeyPairByHdPath(getMnemonic(), hdPath) would.
  async getKeypair(hdPath: HdPathLike) {
    const { privateKey, publicKey } = await generateKeyPairFromSeed(this.seed, hdPath);
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
    getCryptoProvider().memzero(this.seed);
    getCryptoProvider().memzero(this.mnemonicEntropy);
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
      getCryptoProvider().memzero(privateKey);
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

  // Broadcasting an already-signed tx needs no key, only the provider.
  async broadcastTxSync(provider: Provider, signedTx: Tx) {
    return provider.sendTransaction(
      uint8ArrayToBase64(Tx.encode(signedTx).finish()),
      TransactionEndpoint.BROADCAST_TX_SYNC,
    );
  }

  async broadcastTxCommit(provider: Provider, signedTx: Tx) {
    return provider.sendTransaction(
      uint8ArrayToBase64(Tx.encode(signedTx).finish()),
      TransactionEndpoint.BROADCAST_TX_COMMIT,
    );
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
