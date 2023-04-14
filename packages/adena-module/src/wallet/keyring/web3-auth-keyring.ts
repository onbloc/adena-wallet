import { v4 as uuidv4 } from 'uuid';
import { Keyring, KeyringData, KeyringType } from './keyring';
import { Secp256k1, sha256 } from '../../crypto';
import { StdSignDoc, encodeSecp256k1Signature } from '../../amino';
import { serializeSignToGnoDoc } from '../../amino/secp256k1hdwallet';

export class Web3AuthKeyring implements Keyring {
  public readonly id: string;
  public readonly type: KeyringType = 'WEB3_AUTH';
  public readonly publicKey: Uint8Array;
  public readonly privateKey: Uint8Array;

  constructor({ id, publicKey, privateKey }: KeyringData) {
    if (!publicKey || !privateKey) {
      throw new Error('Invalid parameter values');
    }
    this.id = id || uuidv4();
    this.publicKey = Uint8Array.from(publicKey);
    this.privateKey = Uint8Array.from(privateKey);
  }

  toData() {
    return {
      id: this.id,
      type: this.type,
      publicKey: Array.from(this.publicKey),
      privateKey: Array.from(this.privateKey),
    };
  }

  async sign(document: StdSignDoc) {
    const message = sha256(serializeSignToGnoDoc(document));
    const signature = await Secp256k1.createSignature(message, this.privateKey);
    const signatureBytes = new Uint8Array([
      ...(signature.r(32) as any),
      ...(signature.s(32) as any),
    ]);

    return {
      signed: document,
      signature: encodeSecp256k1Signature(this.publicKey, signatureBytes),
    };
  }

  public static async fromPrivateKey(privateKey: Uint8Array) {
    const { pubkey: publicKey } = await Secp256k1.makeKeypair(privateKey);
    return new Web3AuthKeyring({
      publicKey: Array.from(Secp256k1.compressPubkey(publicKey)),
      privateKey: Array.from(privateKey),
    });
  }
}
