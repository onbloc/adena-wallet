import {
  BroadcastTxCommitResult,
  BroadcastTxSyncResult,
  Provider,
  TransactionEndpoint,
  Tx,
  TxSignature,
  uint8ArrayToBase64,
} from '@gnolang/tm2-js-client';
import {
  CompactBitArray,
  createCompactBitArray,
  compactBitArraySetIndex,
  Multisignature,
  PubKeyMultisig,
} from '@gnolang/tm2-js-client/bin/proto/tm2/multisig';
import { PubKeySecp256k1 } from '@gnolang/tm2-js-client/bin/proto/tm2/tx';
import Long from 'long';
import { v4 as uuidv4 } from 'uuid';

import { decodeTxMessages, Document, documentToTx, fromBech32, MultisigConfig } from '../..';
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
  public readonly publicKey: Uint8Array;
  public readonly multisigConfig: MultisigConfig;

  constructor(keyringData: KeyringData) {
    if (!keyringData.addressBytes || !keyringData.multisigConfig) {
      throw new Error('Invalid parameter values');
    }
    this.id = keyringData.id || uuidv4();
    this.addressBytes = Uint8Array.from(keyringData.addressBytes);
    this.publicKey = Uint8Array.from(keyringData.publicKey ?? []);
    this.multisigConfig = keyringData.multisigConfig;
  }

  toData(): KeyringData {
    return {
      id: this.id,
      type: this.type,
      addressBytes: Array.from(this.addressBytes),
      publicKey: Array.from(this.publicKey),
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
   * Create unsigned transaction and sign request for individual signers
   *
   * @param provider - Provider instance
   * @param document - Transaction document
   * @returns Unsigned transaction and sign request payload
   */
  async createSignRequest(document: Document): Promise<{
    unsignedTx: Tx;
    signRequest: {
      chain_id: string;
      account_number: string;
      sequence: string;
      fee: any;
      msgs: any[];
      memo: string;
    };
  }> {
    const unsignedTx = documentToTx(document);

    return {
      unsignedTx,
      signRequest: {
        chain_id: document.chain_id,
        account_number: document.account_number,
        sequence: document.sequence,
        fee: document.fee,
        msgs: decodeTxMessages(unsignedTx.messages),
        memo: document.memo,
      },
    };
  }

  /**
   * Combine individual signatures into a multisig transaction
   *
   * @param unsignedTx - Unsigned transaction
   * @param individualSignatures - Array of individual signatures with metadata
   * @returns Signed multisig transaction
   */
  async combineSignatures(
    unsignedTx: Tx,
    individualSignatures: Array<{
      signerAddress: string;
      signature: Uint8Array;
      pubkey: Uint8Array;
    }>,
  ): Promise<Tx> {
    // 1. Validate threshold
    if (individualSignatures.length < this.threshold) {
      throw new Error(
        `Insufficient signatures: need ${this.threshold}, got ${individualSignatures.length}`,
      );
    }

    // 2. Map signer addresses to indices and sort by index
    const signerData: Array<{
      index: number;
      signature: Uint8Array;
      pubkey: Uint8Array;
    }> = [];

    for (const sig of individualSignatures) {
      const index = this.signers.indexOf(sig.signerAddress);
      if (index === -1) {
        throw new Error(`Unknown signer: ${sig.signerAddress}`);
      }
      signerData.push({
        index,
        signature: sig.signature,
        pubkey: sig.pubkey,
      });
    }

    // Sort by index (required for multisig)
    signerData.sort((a, b) => a.index - b.index);

    // 3. Create CompactBitArray
    const bitArray = createCompactBitArray(this.signers.length);
    signerData.forEach(({ index }) => {
      compactBitArraySetIndex(bitArray, index, true);
    });

    // 4. Create Multisignature
    const multisig = Multisignature.create({
      bit_array: bitArray,
      sigs: signerData.map(({ signature }) => signature),
    });

    // 5. Create PubKeyMultisig
    const multisigPubkey = PubKeyMultisig.create({
      k: Long.fromNumber(this.threshold),
      pub_keys: signerData.map(({ pubkey }) => ({
        type_url: '/tm.PubKeySecp256k1',
        value: PubKeySecp256k1.encode({ key: pubkey }).finish(),
      })),
    });

    // 6. Create signed transaction
    const signedTx: Tx = {
      ...unsignedTx,
      signatures: [
        {
          pub_key: {
            type_url: '/tm.PubKeyMultisig',
            value: PubKeyMultisig.encode(multisigPubkey).finish(),
          },
          signature: Multisignature.encode(multisig).finish(),
        },
      ],
    };

    return signedTx;
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
    return provider.sendTransaction(encodedTx, TransactionEndpoint.BROADCAST_TX_COMMIT);
  }

  /**
   * Create a MultisigKeyring from address
   *
   * @param address - Multisig address (bech32 format)
   * @param publicKey - Multisig account publicKey
   * @param multisigConfig - Multisig configuration
   */
  public static async fromAddress(
    address: string,
    publicKey: Uint8Array,
    multisigConfig: MultisigConfig,
  ): Promise<MultisigKeyring> {
    const { data: addressBytes } = fromBech32(address);
    return new MultisigKeyring({
      type: 'MULTISIG',
      addressBytes: [...addressBytes],
      publicKey: [...publicKey],
      multisigConfig,
    });
  }
}
