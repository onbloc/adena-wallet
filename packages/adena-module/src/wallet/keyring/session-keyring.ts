import { Provider, TransactionEndpoint, Tx, TxSignature, Wallet as Tm2Wallet } from '@gnolang/tm2-js-client';
import { v4 as uuidv4 } from 'uuid';

import { Random } from '../../crypto/random';
import { encodeGnoTxToBase64 } from '../../proto/session/local-tx';
import { Document } from './../..';
import { publicKeyToAddress } from '../../utils/address';
import { Keyring, KeyringData, KeyringType, SignRawOptions } from './keyring';
import { signGnoDocument } from './sign-gno-document';
import { signRawWithPrivateKey } from './sign-raw-util';

export class SessionKeyring implements Keyring {
  public readonly id: string;
  public readonly type: KeyringType = 'SESSION';
  public readonly publicKey: Uint8Array;
  public readonly masterAddress: string;

  public readonly privateKey: Uint8Array;

  constructor({ id, publicKey, privateKey, masterAddress }: KeyringData) {
    if (!publicKey || !privateKey || !masterAddress) {
      throw new Error('Invalid parameter values');
    }
    this.id = id || uuidv4();
    this.publicKey = Uint8Array.from(publicKey);
    this.masterAddress = masterAddress;
    this.privateKey = Uint8Array.from(privateKey);
  }

  // Prevent privateKey from appearing in JSON.stringify output.
  // toData() still explicitly includes it for wallet storage.
  toJSON(): Record<string, unknown> {
    return { id: this.id, type: this.type, publicKey: Array.from(this.publicKey) };
  }

  toData(): KeyringData {
    return {
      id: this.id,
      type: this.type,
      publicKey: Array.from(this.publicKey),
      privateKey: Array.from(this.privateKey),
      masterAddress: this.masterAddress,
    };
  }

  destroy(): void {
    this.privateKey.fill(0);
  }

  async signRaw(bytes: Uint8Array, _opts?: SignRawOptions): Promise<Uint8Array> {
    return signRawWithPrivateKey(bytes, this.privateKey);
  }

  async sign(
    provider: Provider,
    document: Document,
  ): Promise<{ signed: Tx; signature: TxSignature[] }> {
    const sessionAddr = await publicKeyToAddress(this.publicKey, 'g');

    // SessionAccount lives in the master account's session store, not the
    // regular account store, so signGnoDocument's auto lookup against the
    // session's own derived address would miss. The chain also requires
    // sign bytes to use the session's BaseAccount.account_number/sequence
    // (NOT the master values; see gno tm2/pkg/sdk/auth/ante.go).
    //
    // Callers must populate document.account_number/sequence via the
    // transaction service createDocument() flow, which queries
    // auth/accounts/{master}/session/{session} and uses the nested
    // BaseAccount fields. We refuse to silently fetch here to avoid:
    //   - importing GnoProvider session ABCI from adena-module (dep
    //     direction violation), and
    //   - masking createDocument-bypass code paths that would otherwise
    //     sign with stale or wrong (master) account state.
    const accountNumberMissing = !document.account_number || document.account_number === '';
    const sequenceMissing = !document.sequence || document.sequence === '';
    if (accountNumberMissing || sequenceMissing) {
      throw new Error(
        'SessionKeyring.sign() requires document.account_number and document.sequence ' +
          'to be pre-populated via the transaction service createDocument() flow. ' +
          'Direct sign() calls bypassing createDocument() are not supported for ' +
          'SessionAccount because the session store is not at auth/accounts/{address}.',
      );
    }

    return signGnoDocument(provider, document, this, { sessionAddr });
  }

  async broadcastTxSync(provider: Provider, signedTx: Tx) {
    return provider.sendTransaction(encodeGnoTxToBase64(signedTx), TransactionEndpoint.BROADCAST_TX_SYNC);
  }

  async broadcastTxCommit(provider: Provider, signedTx: Tx) {
    return provider.sendTransaction(encodeGnoTxToBase64(signedTx), TransactionEndpoint.BROADCAST_TX_COMMIT);
  }

  public static async generate(masterAddress: string): Promise<SessionKeyring> {
    const privateKey = Random.getBytes(32);
    const wallet = await Tm2Wallet.fromPrivateKey(privateKey);
    const publicKey = await wallet.getSigner().getPublicKey();
    return new SessionKeyring({
      publicKey: Array.from(publicKey),
      privateKey: Array.from(privateKey),
      masterAddress,
    });
  }
}
