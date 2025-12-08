import {
  BroadcastTxCommitResult,
  BroadcastTxSyncResult,
  Provider,
  TransactionEndpoint,
  Tx,
  TxSignature,
  uint8ArrayToBase64,
} from '@gnolang/tm2-js-client';
import { v4 as uuidv4 } from 'uuid';

import { Document, fromBech32, MultisigConfig } from '../..';
import { Keyring, KeyringData } from './keyring';

/**
 * MultisigKeyring class
 *
 * Note: Similar to AddressKeyring (AIRGAP), this stores the address bytes directly.
 * Multisig accounts cannot sign directly - individual signers must sign separately.
 */
export class MultisigKeyring implements Keyring {
  public readonly id: string;
  public readonly type = 'MULTISIG' as const;
  public readonly addressBytes: Uint8Array;
  public readonly multisigConfig: MultisigConfig;

  constructor(keyringData: KeyringData) {
    if (!keyringData.addressBytes || !keyringData.multisigConfig) {
      throw new Error('Invalid parameter values');
    }
    this.id = keyringData.id || uuidv4();
    this.addressBytes = Uint8Array.from(keyringData.addressBytes);
    this.multisigConfig = keyringData.multisigConfig;
  }

  toData(): KeyringData {
    return {
      id: this.id,
      type: this.type,
      addressBytes: Array.from(this.addressBytes),
      multisigConfig: this.multisigConfig,
    };
  }

  public get threshold(): number {
    return this.multisigConfig.threshold;
  }

  public get signers(): string[] {
    return this.multisigConfig.signers;
  }

  /**
   * Multisig cannot sign directly
   * Individual signers must sign separately
   */
  async sign(
    _provider: Provider,
    _document: Document,
  ): Promise<{
    signed: Tx;
    signature: TxSignature[];
  }> {
    throw new Error('Multisig accounts cannot sign directly. Use individual signer accounts.');
  }

  /**
   * Broadcast signed multisig transaction
   */
  async broadcastTxSync(provider: Provider, signedTx: Tx): Promise<BroadcastTxSyncResult> {
    const encodedTx: string = uint8ArrayToBase64(Tx.encode(signedTx).finish());
    return provider.sendTransaction(encodedTx, TransactionEndpoint.BROADCAST_TX_SYNC);
  }

  /**
   * Broadcast signed multisig transaction
   */
  async broadcastTxCommit(provider: Provider, signedTx: Tx): Promise<BroadcastTxCommitResult> {
    const encodedTx: string = uint8ArrayToBase64(Tx.encode(signedTx).finish());
    console.log(encodedTx, 'encodedTx');
    return provider.sendTransaction(encodedTx, TransactionEndpoint.BROADCAST_TX_COMMIT);
  }

  /**
   * Create a MultisigKeyring from address
   *
   * @param address - Multisig address (bech32 format)
   * @param threshold - Signature threshold
   */
  public static async fromAddress(
    address: string,
    multisigConfig: MultisigConfig,
  ): Promise<MultisigKeyring> {
    const { data: addressBytes } = fromBech32(address);
    return new MultisigKeyring({
      type: 'MULTISIG',
      addressBytes: [...addressBytes],
      multisigConfig,
    });
  }
}
