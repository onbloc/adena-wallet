import { HdPath, Secp256k1, Slip10, Slip10Curve, Slip10RawIndex } from '@cosmjs/crypto';

export interface KeyPair {
  privateKey: Uint8Array;
  // 33-byte compressed secp256k1 public key.
  publicKey: Uint8Array;
}

export const DEFAULT_COIN_TYPE = 118;

// m/44'/{coinType}'/0'/0/{index}, the path shared by Gno and Cosmos SDK chains.
export const makeHdPath = (index: number, coinType = DEFAULT_COIN_TYPE): HdPath => [
  Slip10RawIndex.hardened(44),
  Slip10RawIndex.hardened(coinType),
  Slip10RawIndex.hardened(0),
  Slip10RawIndex.normal(0),
  Slip10RawIndex.normal(index),
];

export const keyPairFromPrivateKey = (privateKey: Uint8Array): KeyPair => {
  const { pubkey } = Secp256k1.makeKeypair(privateKey);

  return { privateKey: Uint8Array.from(privateKey), publicKey: Secp256k1.compressPubkey(pubkey) };
};

export const deriveKeyPair = (seed: Uint8Array, index: number, coinType?: number): KeyPair => {
  const { privkey } = Slip10.derivePath(Slip10Curve.Secp256k1, seed, makeHdPath(index, coinType));

  return keyPairFromPrivateKey(privkey);
};

export const wipeKeyPair = (keyPair: KeyPair): void => {
  keyPair.privateKey.fill(0);
};
