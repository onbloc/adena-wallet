import { v4 as uuidv4 } from 'uuid';
import { Bip39, EnglishMnemonic, Secp256k1, Slip10, Slip10Curve, sha256 } from '../../crypto';
import { makeGnolandPath } from '../../amino/paths';
import { Keyring, KeyringData, KeyringType } from './keyring';
import { StdSignDoc, encodeSecp256k1Signature } from '../../amino';
import { serializeSignToGnoDoc } from '../../amino/secp256k1hdwallet';

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
    const privateKey = this.getPrivateKey(hdPath);
    const { pubkey: publicKey } = await Secp256k1.makeKeypair(privateKey);
    return { privateKey, publicKey: Secp256k1.compressPubkey(publicKey) };
  }

  getPrivateKey(hdPath: number) {
    const gnolandPath = makeGnolandPath(hdPath);
    const { privkey: privateKey } = Slip10.derivePath(
      Slip10Curve.Secp256k1,
      this.seed,
      gnolandPath,
    );
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

  async sign(document: StdSignDoc, hdPath: number = 0) {
    const { publicKey, privateKey } = await this.getKeypair(hdPath);
    const message = sha256(serializeSignToGnoDoc(document));
    const signature = await Secp256k1.createSignature(message, privateKey);
    const signatureBytes = new Uint8Array([
      ...(signature.r(32) as any),
      ...(signature.s(32) as any),
    ]);

    return {
      signed: document,
      signature: encodeSecp256k1Signature(publicKey, signatureBytes),
    };
  }

  public static async fromMnemonic(mnemonic: string) {
    const enblishMnemonic = new EnglishMnemonic(mnemonic);
    const seed = await Bip39.mnemonicToSeed(enblishMnemonic);
    return new HDWalletKeyring({ mnemonic, seed: Array.from(seed) });
  }
}
