import {
  encodeCharacterSet,
  sortedJsonStringify,
  stringToUTF8,
  TxSignPayload,
} from '@gnolang/tm2-js-client';

import { toBase64 } from '../../encoding/base64';
import { toUtf8 } from '../../encoding/utf8';
import { publicKeyToAddress } from '../../utils/address';
import { HdPathLike } from './hd-path';
import { Keyring } from './keyring';

const GNO_ADDRESS_PREFIX = 'g';

// The ADR-036 message type for off-chain data, deliberately unregistered in
// tm2: amino resolves a message by registered name, and nothing registers
// `sign`. A node cannot decode a transaction carrying it, which is what keeps
// a signed document from being broadcast. The chain id plays no part in that.
export const ARBITRARY_MSG_TYPE = 'sign/MsgSignData';

// Fixed at zero so the payload stays a pure function of (chainId, signer, data)
// and a verifier can rebuild it from those three values alone.
const ARBITRARY_ACCOUNT_NUMBER = '0';
const ARBITRARY_SEQUENCE = '0';
const ARBITRARY_GAS = '0';

export interface ArbitraryMessage {
  type: typeof ARBITRARY_MSG_TYPE;
  value: {
    signer: string;
    data: string;
  };
}

export interface SignArbitraryParams {
  keyring: Keyring;
  // Passed in rather than resolved here: importing keyring-util would create
  // `session-keyring -> sign-arbitrary -> keyring-util -> session-keyring`.
  // signGnoDocument works around the same cycle with a local resolver.
  publicKey: Uint8Array;
  chainId: string;
  signer: string;
  data: string;
  hdPath?: HdPathLike;
}

/**
 * Build the document signed by `SignArbitrary`.
 *
 * ADR-036 with one deviation: `chain_id` carries the connected network rather
 * than the empty string the Cosmos convention mandates, so a proof gathered on
 * one network cannot be replayed as a proof on another.
 *
 * `fee.amount` MUST be an empty array and not a zero coin. The Ledger Cosmos
 * app displays every coin it is handed, so `{"denom":"","amount":"0"}` would
 * both misstate the document and risk rejection on the device.
 */
export function makeArbitraryMessageDoc(
  chainId: string,
  signer: string,
  data: string,
): TxSignPayload {
  const message: ArbitraryMessage = {
    type: ARBITRARY_MSG_TYPE,
    value: {
      signer,
      data: toBase64(toUtf8(data)),
    },
  };

  return {
    chain_id: chainId,
    account_number: ARBITRARY_ACCOUNT_NUMBER,
    sequence: ARBITRARY_SEQUENCE,
    fee: {
      amount: [],
      gas: ARBITRARY_GAS,
    },
    msgs: [message],
    memo: '',
  };
}

// Same pipeline as signGnoDocument, so arbitrary-data and transaction
// signatures share one serialization contract.
export function getArbitraryMessageSignBytes(doc: TxSignPayload): Uint8Array {
  return stringToUTF8(encodeCharacterSet(sortedJsonStringify(doc)));
}

/**
 * Sign arbitrary data as proof that the holder of `signer` controls it.
 * Nothing produced here is broadcastable; see ARBITRARY_MSG_TYPE.
 */
export async function signArbitraryMessage(
  params: SignArbitraryParams,
): Promise<{ doc: TxSignPayload; signature: Uint8Array }> {
  const { keyring, publicKey, chainId, signer, data, hdPath } = params;

  if (chainId.length === 0) {
    throw new Error('Arbitrary message signing requires a chain id');
  }

  if (data.length === 0) {
    throw new Error('Arbitrary message signing requires a non-empty message');
  }

  // Without this the document could name one address while being signed by the
  // key of another, which is the claim a verifier relies on.
  const derivedAddress = await publicKeyToAddress(publicKey, GNO_ADDRESS_PREFIX);
  if (derivedAddress !== signer) {
    throw new Error('Signer does not match the signing key');
  }

  const doc = makeArbitraryMessageDoc(chainId, signer, data);
  const signature = await keyring.signRaw(getArbitraryMessageSignBytes(doc), { hdPath });

  return { doc, signature };
}
