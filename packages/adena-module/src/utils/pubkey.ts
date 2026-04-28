import { Secp256k1 } from '@cosmjs/crypto';

/**
 * Normalize a secp256k1 public key to the 33-byte compressed form expected by
 * gno.land / Cosmos SDK PubKeySecp256k1 amino-decoders.
 *
 * HD wallet accounts in this codebase store the 65-byte uncompressed form
 * (tm2 wallet default) while PrivateKey/Web3Auth accounts store the
 * 33-byte compressed form (tm2 Wallet.fromPrivateKey compresses on load).
 * Forwarding an uncompressed key to a node triggers `/std.TxDecodeError`
 * — see ADN-750 / ADN-755.
 *
 * Inputs that are neither 33 nor 65 bytes pass through unchanged so this
 * stays safe to call from boundaries that may see fixture/sentinel bytes
 * (e.g. test mocks). Real validation belongs at the next layer.
 */
export function compressPubkeyIfNeeded(publicKey: Uint8Array): Uint8Array {
  return publicKey.length === 65 ? Secp256k1.compressPubkey(publicKey) : publicKey;
}
