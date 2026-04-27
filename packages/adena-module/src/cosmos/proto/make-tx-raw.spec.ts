import { Secp256k1 } from '@cosmjs/crypto';
import { PubKey } from 'cosmjs-types/cosmos/crypto/secp256k1/keys';
import { SignMode } from 'cosmjs-types/cosmos/tx/signing/v1beta1/signing';
import { AuthInfo, TxBody, TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx';

import { MSG_SEND_AMINO_TYPE, MSG_SEND_TYPE_URL } from '../codec/msg-send';

import { aminoMsgsToAnys, makeTxRaw } from './make-tx-raw';

describe('makeTxRaw', () => {
  const aminoMsg = {
    type: MSG_SEND_AMINO_TYPE,
    value: {
      from_address: 'atone1qqqsyqcyq5rqwzqfpg9scrgwpugpzysndkda8p',
      to_address: 'atone1qyqszqgpqyqszqgpqyqszqgpqyqszqgpwc2vge',
      amount: [{ denom: 'uphoton', amount: '1000' }],
    },
  };

  // 33-byte compressed secp256k1 pubkey (arbitrary valid constant shape — 0x02 prefix + 32 bytes).
  const compressedPubKey = new Uint8Array(33);
  compressedPubKey[0] = 0x02;
  for (let i = 1; i < 33; i++) compressedPubKey[i] = i;

  const signature = new Uint8Array(64).fill(7);
  const fee = {
    amount: [{ denom: 'uphoton', amount: '1000' }],
    gas: '200000',
  };

  it('produces a TxRaw that decodes with AMINO mode, correct pubkey typeUrl, and preserved signature', () => {
    const txBytes = makeTxRaw({
      msgs: [aminoMsg],
      memo: 'hello',
      fee,
      sequence: '5',
      publicKey: compressedPubKey,
      signature,
    });

    const raw = TxRaw.decode(txBytes);
    const body = TxBody.decode(raw.bodyBytes);
    const authInfo = AuthInfo.decode(raw.authInfoBytes);

    expect(body.memo).toBe('hello');
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].typeUrl).toBe(MSG_SEND_TYPE_URL);

    const signerInfo = authInfo.signerInfos[0];
    expect(signerInfo.modeInfo?.single?.mode).toBe(
      SignMode.SIGN_MODE_LEGACY_AMINO_JSON,
    );
    expect(signerInfo.publicKey?.typeUrl).toBe(
      '/cosmos.crypto.secp256k1.PubKey',
    );
    expect(signerInfo.sequence).toBe(5n);

    expect(authInfo.fee?.gasLimit).toBe(200000n);
    expect(authInfo.fee?.amount).toEqual([{ denom: 'uphoton', amount: '1000' }]);

    expect(raw.signatures).toHaveLength(1);
    expect(raw.signatures[0]).toEqual(signature);
  });

  it('compresses an uncompressed 65-byte pubkey before encoding', () => {
    // Derive a real 33-byte compressed key, then decompress to 65 bytes to feed in.
    // We emulate what could happen if an upstream keyring supplied uncompressed form.
    const priv = new Uint8Array(32).fill(9);
    // Secp256k1.makeKeypair returns compressed publicKey; decompress via Secp256k1.uncompressPubkey.
    return Secp256k1.makeKeypair(priv).then((kp) => {
      const compressed = Secp256k1.compressPubkey(kp.pubkey);
      const uncompressed = kp.pubkey; // already 65 bytes
      expect(uncompressed.length).toBe(65);

      const txBytes = makeTxRaw({
        msgs: [aminoMsg],
        memo: '',
        fee,
        sequence: '0',
        publicKey: uncompressed,
        signature,
      });

      const raw = TxRaw.decode(txBytes);
      const authInfo = AuthInfo.decode(raw.authInfoBytes);
      const pub = PubKey.decode(authInfo.signerInfos[0].publicKey!.value);
      expect(pub.key.length).toBe(33);
      expect(Array.from(pub.key)).toEqual(Array.from(compressed));
    });
  });

  it('passes compressed pubkey through unchanged', () => {
    const txBytes = makeTxRaw({
      msgs: [aminoMsg],
      memo: '',
      fee,
      sequence: '0',
      publicKey: compressedPubKey,
      signature,
    });

    const raw = TxRaw.decode(txBytes);
    const authInfo = AuthInfo.decode(raw.authInfoBytes);
    const pub = PubKey.decode(authInfo.signerInfos[0].publicKey!.value);
    expect(Array.from(pub.key)).toEqual(Array.from(compressedPubKey));
  });

  it('aminoMsgsToAnys throws on unknown amino type', () => {
    expect(() => aminoMsgsToAnys([{ type: 'cosmos-sdk/Unknown', value: {} }]))
      .toThrow(/Unknown amino message type/);
  });
});
