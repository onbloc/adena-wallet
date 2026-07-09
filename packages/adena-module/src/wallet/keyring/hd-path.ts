import {
  Bip39,
  EnglishMnemonic,
  Secp256k1,
  Slip10,
  Slip10Curve,
  Slip10RawIndex,
} from '@cosmjs/crypto';

// Adena fixes the BIP44 purpose (44') and coin type (118', Cosmos). Only the
// lower three path components — account', change, and address index — are
// user-configurable. `m/44'/118'/{account}'/{change}/{addressIndex}`.
export const HD_PATH_PURPOSE = 44;
export const HD_PATH_COIN_TYPE = 118;

export interface HdPath {
  account: number;
  change: number;
  addressIndex: number;
}

// Historically an account's derivation was stored as a single integer — the
// address index — with account'/change fixed to 0. `HdPathLike` keeps that path
// working: a bare number is interpreted as `{ account: 0, change: 0, addressIndex }`.
export type HdPathLike = number | HdPath;

export function toHdPath(value: HdPathLike | undefined): HdPath {
  if (value === undefined) {
    return { account: 0, change: 0, addressIndex: 0 };
  }

  if (typeof value === 'number') {
    return { account: 0, change: 0, addressIndex: value };
  }

  return value;
}

export function getAddressIndex(value: HdPathLike | undefined): number {
  return toHdPath(value).addressIndex;
}

export function toSlip10Path(value: HdPathLike): Slip10RawIndex[] {
  const { account, change, addressIndex } = toHdPath(value);
  return [
    Slip10RawIndex.hardened(HD_PATH_PURPOSE),
    Slip10RawIndex.hardened(HD_PATH_COIN_TYPE),
    Slip10RawIndex.hardened(account),
    Slip10RawIndex.normal(change),
    Slip10RawIndex.normal(addressIndex),
  ];
}

export function formatHdPath(value: HdPathLike): string {
  const { account, change, addressIndex } = toHdPath(value);
  return `m/${HD_PATH_PURPOSE}'/${HD_PATH_COIN_TYPE}'/${account}'/${change}/${addressIndex}`;
}

// Derives a Secp256k1 key pair from a mnemonic at the given HD path. Uses the
// same primitives (@cosmjs/crypto Bip39 → Slip10 → Secp256k1) as
// tm2-js-client's generateKeyPair, so a bare address index yields byte-identical
// keys — and therefore identical addresses — to accounts created before custom
// paths existed.
export async function generateKeyPairByHdPath(
  mnemonic: string,
  hdPath: HdPathLike,
): Promise<{ privateKey: Uint8Array; publicKey: Uint8Array }> {
  const seed = await Bip39.mnemonicToSeed(new EnglishMnemonic(mnemonic));
  const { privkey } = Slip10.derivePath(Slip10Curve.Secp256k1, seed, toSlip10Path(hdPath));
  const { pubkey } = await Secp256k1.makeKeypair(privkey);

  return { privateKey: privkey, publicKey: pubkey };
}
