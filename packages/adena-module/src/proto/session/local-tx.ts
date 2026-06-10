import {
  Tx,
  TxFee,
  TxSignature,
  base64ToUint8Array,
  uint8ArrayToBase64,
} from '@gnolang/tm2-js-client';
import { BinaryReader, BinaryWriter } from '@bufbuild/protobuf/wire';
import { Any } from '@gnolang/tm2-js-client/bin/proto/google/protobuf/any';
import { isLocalTxSignature, LocalTxSignature } from './local-tx-signature';

// encodeGnoTx is a drop-in replacement for Tx.encode(tx).finish() that also
// handles session signatures. When no signature has session_addr set it falls
// back to the standard Tx encoder so wire bytes are bit-identical.
export function encodeGnoTx(tx: Tx): Uint8Array {
  const hasSession = tx.signatures.some(isLocalTxSignature);
  if (!hasSession) {
    return Tx.encode(tx).finish();
  }

  const writer = new BinaryWriter();

  for (const v of tx.messages) {
    Any.encode(v, writer.uint32(10).fork()).join();
  }
  if (tx.fee !== undefined) {
    TxFee.encode(tx.fee, writer.uint32(18).fork()).join();
  }
  for (const v of tx.signatures) {
    LocalTxSignature.encode(v as LocalTxSignature, writer.uint32(26).fork()).join();
  }
  if (tx.memo !== '') {
    writer.uint32(34).string(tx.memo);
  }
  return writer.finish();
}

export function encodeGnoTxToBase64(tx: Tx): string {
  return uint8ArrayToBase64(encodeGnoTx(tx));
}

export function extractSessionAddressFromGnoTx(encodedTx: Uint8Array): string | null {
  try {
    const reader = new BinaryReader(encodedTx);
    while (reader.pos < reader.len) {
      const tag = reader.uint32();
      if (tag === 0 || (tag & 7) === 4) {
        break;
      }

      if (tag === 26) {
        const signature = LocalTxSignature.decode(reader.bytes());
        if (signature.session_addr) {
          return signature.session_addr;
        }
        continue;
      }

      reader.skip(tag & 7);
    }
  } catch {
    return null;
  }

  return null;
}

export function extractSessionAddressFromGnoTxBase64(encodedTx: string): string | null {
  try {
    return extractSessionAddressFromGnoTx(base64ToUint8Array(encodedTx));
  } catch {
    return null;
  }
}

// Re-export for convenience so callers only need one import.
export { LocalTxSignature, isLocalTxSignature };
export type { TxSignature };
