import { Tx, TxSignature, uint8ArrayToBase64 } from '@gnolang/tm2-js-client';

import {
  LocalTxSignature,
  encodeGnoTxToBase64,
  extractSessionAddressFromGnoTxBase64,
} from './local-tx';

describe('extractSessionAddressFromGnoTxBase64', () => {
  it('extracts session_addr from a local session signature', () => {
    const sessionAddress = 'g1sessionaddress00000000000000000000000';
    const signature: LocalTxSignature = {
      pub_key: {
        type_url: '/tm.PubKeySecp256k1',
        value: new Uint8Array([4, 5, 6]),
      },
      signature: new Uint8Array([1, 2, 3]),
      session_addr: sessionAddress,
    };
    const tx: Tx = {
      messages: [],
      fee: undefined,
      signatures: [signature],
      memo: '',
    };

    const encoded = encodeGnoTxToBase64(tx);

    expect(extractSessionAddressFromGnoTxBase64(encoded)).toBe(sessionAddress);
  });

  it('returns null when the tx has no session signature', () => {
    const signature: TxSignature = {
      signature: new Uint8Array([1, 2, 3]),
    };
    const tx: Tx = {
      messages: [],
      fee: undefined,
      signatures: [signature],
      memo: '',
    };

    const encoded = encodeGnoTxToBase64(tx);

    expect(extractSessionAddressFromGnoTxBase64(encoded)).toBeNull();
  });

  it('returns null for invalid tx bytes', () => {
    const encoded = uint8ArrayToBase64(new Uint8Array([255]));

    expect(extractSessionAddressFromGnoTxBase64(encoded)).toBeNull();
  });
});
