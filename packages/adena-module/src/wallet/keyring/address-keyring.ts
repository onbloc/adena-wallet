import {
  Provider,
  TransactionEndpoint,
  Tx,
  TxSignature,
  uint8ArrayToBase64,
} from '@gnolang/tm2-js-client';
import { v4 as uuidv4 } from 'uuid';

import { Document, fromBech32 } from '../..';
import { Keyring, KeyringData, KeyringType, SignRawOptions } from './keyring';

export class AddressKeyring implements Keyring {
  public readonly id: string;
  public readonly type: KeyringType = 'AIRGAP';
  public readonly addressBytes: Uint8Array;

  constructor({ id, addressBytes }: KeyringData) {
    if (!addressBytes) {
      throw new Error('Invalid parameter values');
    }
    this.id = id || uuidv4();
    this.addressBytes = Uint8Array.from(addressBytes);
  }

  toData() {
    return {
      id: this.id,
      type: this.type,
      addressBytes: Array.from(this.addressBytes),
    };
  }

  async signRaw(_bytes: Uint8Array, _opts?: SignRawOptions): Promise<Uint8Array> {
    // AIRGAP keyrings intentionally hold no private key. Signing happens on an
    // external air-gapped device; the wallet only stores the address and
    // broadcasts pre-signed transactions.
    throw new Error('AIRGAP keyring cannot sign');
  }

  async sign(
    _provider: Provider,
    _document: Document,
  ): Promise<{
    signed: Tx;
    signature: TxSignature[];
  }> {
    throw new Error('Not support transaction sign');
  }

  async broadcastTxSync(provider: Provider, signedTx: Tx) {
    const encodedTx: string = uint8ArrayToBase64(Tx.encode(signedTx).finish());
    return provider.sendTransaction(encodedTx, TransactionEndpoint.BROADCAST_TX_SYNC);
  }

  async broadcastTxCommit(provider: Provider, signedTx: Tx) {
    const encodedTx: string = uint8ArrayToBase64(Tx.encode(signedTx).finish());
    return provider.sendTransaction(encodedTx, TransactionEndpoint.BROADCAST_TX_COMMIT);
  }

  public static async fromAddress(address: string) {
    const { data: addressBytes } = fromBech32(address);
    return new AddressKeyring({ addressBytes: [...addressBytes] });
  }
}
