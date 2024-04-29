import { Provider, TransactionEndpoint, Tx, Wallet as Tm2Wallet } from '@gnolang/tm2-js-client';
import { Wallet as Tm2WalletLegacy } from '@gnolang/tm2-js-client-legacy';
import { v4 as uuidv4 } from 'uuid';
import { Keyring, KeyringData, KeyringType } from './keyring';
import { Document, documentToTx, decodeTxMessages, useTm2Wallet } from './../..';

export class PrivateKeyKeyring implements Keyring {
  public readonly id: string;
  public readonly type: KeyringType = 'PRIVATE_KEY';
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

  async sign(provider: Provider, document: Document) {
    const wallet = await useTm2Wallet(document).fromPrivateKey(this.privateKey);
    wallet.connect(provider);
    return this.signByWallet(wallet, document);
  }

  private async signByWallet(wallet: Tm2Wallet | Tm2WalletLegacy, document: Document) {
    const tx = documentToTx(document);
    const signedTx = await wallet.signTransaction(tx, decodeTxMessages);
    return {
      signed: signedTx,
      signature: signedTx.signatures,
    };
  }

  async broadcastTxSync(provider: Provider, signedTx: Tx) {
    const wallet = await Tm2Wallet.fromPrivateKey(this.privateKey);
    wallet.connect(provider);
    return wallet.sendTransaction(signedTx, TransactionEndpoint.BROADCAST_TX_SYNC);
  }

  async broadcastTxCommit(provider: Provider, signedTx: Tx) {
    const wallet = await Tm2Wallet.fromPrivateKey(this.privateKey);
    wallet.connect(provider);
    return wallet.sendTransaction(signedTx, TransactionEndpoint.BROADCAST_TX_COMMIT);
  }

  public static async fromPrivateKeyStr(privateKeyStr: string) {
    const adjustPrivateKeyStr = privateKeyStr.replace('0x', '');
    const privateKey = Uint8Array.from(Buffer.from(adjustPrivateKeyStr, 'hex'));
    const wallet = await Tm2Wallet.fromPrivateKey(privateKey);
    const publicKey = await wallet.getSigner().getPublicKey();
    return new PrivateKeyKeyring({
      publicKey: Array.from(publicKey),
      privateKey: Array.from(privateKey),
    });
  }
}
