import { Secp256k1 } from '@cosmjs/crypto';

import { sha256 } from '../../crypto';

// Shared signing primitive for private-key-holding keyrings.
// Matches tm2 KeySigner.signData byte-for-byte so that Gno regression stays bit-equal.
// See: node_modules/@gnolang/tm2-js-client/bin/wallet/key/key.js:80-90
export async function signRawWithPrivateKey(
  bytes: Uint8Array,
  privateKey: Uint8Array,
): Promise<Uint8Array> {
  const digest = sha256(bytes);
  const signature = await Secp256k1.createSignature(digest, privateKey);
  return new Uint8Array([...signature.r(32), ...signature.s(32)]);
}
