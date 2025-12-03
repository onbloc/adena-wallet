import {
  BroadcastTxCommitResult,
  BroadcastTxSyncResult,
  Provider,
  Tx,
  TxSignature,
} from '@gnolang/tm2-js-client';
import { v4 as uuidv4 } from 'uuid';

import { Document } from './../..';
import { Keyring, KeyringData } from './keyring';

/**
 * MultisigKeyring class
 *
 * Note: Multisig accounts cannot sign directly.
 * Individual signer accounts must sign separately.
 */
export class MultisigKeyring implements Keyring {
  public readonly id: string;
  public readonly type = 'MULTISIG' as const;
  public readonly threshold: number;
  public readonly signerPublicKeys: Uint8Array[];
  private _publicKey: Uint8Array;

  constructor(keyringData: KeyringData) {
    this.id = keyringData.id || uuidv4();
    this.threshold = keyringData.threshold || 0;
    this.signerPublicKeys = (keyringData.signerPublicKeys || []).map((pk) => new Uint8Array(pk));
    this._publicKey = keyringData.publicKey
      ? new Uint8Array(keyringData.publicKey)
      : new Uint8Array();
  }

  get publicKey(): Uint8Array {
    return this._publicKey;
  }

  toData(): KeyringData {
    return {
      id: this.id,
      type: this.type,
      publicKey: Array.from(this._publicKey),
      threshold: this.threshold,
      signerPublicKeys: this.signerPublicKeys.map((pk) => Array.from(pk)),
    };
  }

  /**
   * Multisig cannot sign directly
   * Individual signers must sign separately
   */
  async sign(
    _provider: Provider,
    _document: Document,
    _hdPath?: number,
  ): Promise<{
    signed: Tx;
    signature: TxSignature[];
  }> {
    throw new Error('Multisig accounts cannot sign directly. Use individual signer accounts.');
  }

  /**
   * Multisig cannot broadcast directly
   * Use the multisig transaction service to broadcast
   */
  async broadcastTxSync(
    _provider: Provider,
    _signedTx: Tx,
    _hdPath?: number,
  ): Promise<BroadcastTxSyncResult> {
    throw new Error(
      'Multisig accounts cannot broadcast directly. Use multisig transaction service.',
    );
  }

  /**
   * Multisig cannot broadcast directly
   * Use the multisig transaction service to broadcast
   */
  async broadcastTxCommit(
    _provider: Provider,
    _signedTx: Tx,
    _hdPath?: number,
  ): Promise<BroadcastTxCommitResult> {
    throw new Error(
      'Multisig accounts cannot broadcast directly. Use multisig transaction service.',
    );
  }

  /**
   * Create a MultisigKeyring from public keys
   */
  public static async fromPublicKeys(
    publicKeys: Uint8Array[],
    threshold: number,
    multisigPublicKey: Uint8Array,
  ): Promise<MultisigKeyring> {
    return new MultisigKeyring({
      type: 'MULTISIG',
      threshold,
      signerPublicKeys: publicKeys.map((pk) => Array.from(pk)),
      publicKey: Array.from(multisigPublicKey),
    });
  }
}
