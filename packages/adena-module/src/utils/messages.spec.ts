import { Secp256k1 } from '@cosmjs/crypto';
import { MsgEndpoint } from '@gnolang/gno-js-client';
import { PubKeySecp256k1 } from '@gnolang/tm2-js-client';
import { Any } from '@gnolang/tm2-js-client';

import { MsgCreateSession } from '../proto';
import {
  decodeTxMessages,
  Document,
  documentToDefaultTx,
  documentToTx,
} from './messages';
import { MSG_CREATE_SESSION_ENDPOINT } from './session-message-endpoints';

function makeDocument(): Document {
  return {
    msgs: [
      {
        type: MsgEndpoint.MSG_SEND,
        value: {
          from_address: 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5',
          to_address: 'g1kcdd3n0d472g2p5l8svyg9t0wq6h5857nq992f',
          amount: '1000ugnot',
        },
      } as unknown as Document['msgs'][number],
    ],
    fee: {
      gas: '200000',
      amount: [{ denom: 'ugnot', amount: '1000' }],
    },
    memo: '',
    chain_id: 'staging',
    account_number: '0',
    sequence: '0',
  };
}

describe('documentToDefaultTx', () => {
  it('leaves pub_key empty when no publicKey is provided (back-compat)', () => {
    const tx = documentToDefaultTx(makeDocument());

    expect(tx.signatures).toHaveLength(1);
    const sig = tx.signatures[0];
    expect(sig.pub_key?.type_url).toBe('');
    expect(sig.pub_key?.value).toEqual(new Uint8Array());
    expect(sig.signature).toEqual(new Uint8Array());
  });

  it('leaves pub_key empty when publicKey is an empty Uint8Array (AirGap case)', () => {
    const tx = documentToDefaultTx(makeDocument(), new Uint8Array());

    expect(tx.signatures[0].pub_key?.type_url).toBe('');
    expect(tx.signatures[0].pub_key?.value).toEqual(new Uint8Array());
  });

  it('wraps the provided compressed pubkey with /tm.PubKeySecp256k1', () => {
    const pubkey = new Uint8Array(33).fill(0x02);
    const tx = documentToDefaultTx(makeDocument(), pubkey);

    const sig = tx.signatures[0];
    expect(sig.pub_key?.type_url).toBe('/tm.PubKeySecp256k1');

    const wrapped = PubKeySecp256k1.encode({ key: pubkey }).finish();
    expect(Buffer.from(sig.pub_key!.value).equals(Buffer.from(wrapped))).toBe(true);

    // Signature stays empty, simulate does not verify the signature itself.
    expect(sig.signature).toEqual(new Uint8Array());
  });

  // Regression guard: HD wallet accounts store the 65-byte uncompressed form.
  // Forwarding it as-is breaks gno.land amino-decode (`/std.TxDecodeError`)
  // See ADN-755 reintroduction after the ADN-750 fix.
  it('compresses a 65-byte uncompressed pubkey before wrapping', async () => {
    // Make a real keypair so the 65-byte input is on-curve and compresses
    // deterministically, Secp256k1.compressPubkey rejects garbage bytes.
    const priv = new Uint8Array(32).fill(0x11);
    const keypair = await Secp256k1.makeKeypair(priv);
    const uncompressed = Secp256k1.uncompressPubkey(keypair.pubkey);
    expect(uncompressed.length).toBe(65);

    const tx = documentToDefaultTx(makeDocument(), uncompressed);

    const sig = tx.signatures[0];
    expect(sig.pub_key?.type_url).toBe('/tm.PubKeySecp256k1');

    const expectedCompressed = Secp256k1.compressPubkey(uncompressed);
    expect(expectedCompressed.length).toBe(33);
    const expectedWrapped = PubKeySecp256k1.encode({
      key: expectedCompressed,
    }).finish();
    expect(Buffer.from(sig.pub_key!.value).equals(Buffer.from(expectedWrapped))).toBe(
      true,
    );
  });
});

describe('session messages', () => {
  function makeSessionKey(): Any {
    return Any.create({
      type_url: '/tm.PubKeySecp256k1',
      value: PubKeySecp256k1.encode({ key: new Uint8Array(33).fill(0x02) }).finish(),
    });
  }

  it('decodes MsgCreateSession without delegating nested Any.decode', () => {
    const msg = MsgCreateSession.create({
      creator: 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5',
      session_key: makeSessionKey(),
      expires_at: BigInt(1779436464),
      allow_paths: ['bank/send'],
      spend_limit: '1000000ugnot',
      spend_period: BigInt(1),
    });
    const encoded = MsgCreateSession.encode(msg).finish();
    const decodeSpy = jest.spyOn(Any, 'decode').mockImplementation(() => {
      throw new Error('nested Any.decode must not be called');
    });

    try {
      const decoded = MsgCreateSession.decode(encoded);
      expect(decoded.session_key?.type_url).toBe('/tm.PubKeySecp256k1');
      expect(decoded.session_key?.value).toEqual(makeSessionKey().value);
    } finally {
      decodeSpy.mockRestore();
    }
  });

  it('round trips create session messages through documentToTx and decodeTxMessages', () => {
    const msg = {
      type: MSG_CREATE_SESSION_ENDPOINT,
      value: {
        creator: 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5',
        session_key: makeSessionKey(),
        expires_at: BigInt(1779436464),
        allow_paths: ['bank/send'],
        spend_limit: '1000000ugnot',
        spend_period: BigInt(1),
      },
    };
    const document: Document = {
      msgs: [msg],
      fee: {
        gas: '200000',
        amount: [{ denom: 'ugnot', amount: '1000000' }],
      },
      memo: '',
      chain_id: 'test-13',
      account_number: '2701052',
      sequence: '0',
    };

    const decoded = decodeTxMessages(documentToTx(document).messages);

    expect(decoded[0]).toMatchObject({
      '@type': MSG_CREATE_SESSION_ENDPOINT,
      creator: 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5',
      allow_paths: ['bank/send'],
      spend_limit: '1000000ugnot',
      spend_period: '1',
    });
    expect(decoded[0].session_key.value).toBe(
      Buffer.from(new Uint8Array(33).fill(0x02)).toString('base64'),
    );
  });

  it('round trips JSON-safe create session messages through documentToTx', () => {
    const msg = {
      type: MSG_CREATE_SESSION_ENDPOINT,
      value: {
        creator: 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5',
        session_key: makeSessionKey(),
        expires_at: '1779436464',
        allow_paths: ['bank/send'],
        spend_limit: '1000000ugnot',
        spend_period: '1',
      },
    };
    const jsonSafeMsg = JSON.parse(JSON.stringify(msg));
    const document: Document = {
      msgs: [jsonSafeMsg],
      fee: {
        gas: '200000',
        amount: [{ denom: 'ugnot', amount: '1000000' }],
      },
      memo: '',
      chain_id: 'test-13',
      account_number: '2701052',
      sequence: '0',
    };

    const decoded = decodeTxMessages(documentToTx(document).messages);

    expect(decoded[0]).toMatchObject({
      '@type': MSG_CREATE_SESSION_ENDPOINT,
      creator: 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5',
      expires_at: '1779436464',
      allow_paths: ['bank/send'],
      spend_limit: '1000000ugnot',
      spend_period: '1',
    });
    expect(decoded[0].session_key.value).toBe(
      Buffer.from(new Uint8Array(33).fill(0x02)).toString('base64'),
    );
  });

  it('omits create session zero values that Go amino JSON omits', () => {
    const msg = {
      type: MSG_CREATE_SESSION_ENDPOINT,
      value: {
        creator: 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5',
        session_key: makeSessionKey(),
        expires_at: BigInt(0),
        allow_paths: ['bank/send'],
        spend_limit: '',
        spend_period: BigInt(0),
      },
    };
    const document: Document = {
      msgs: [msg],
      fee: {
        gas: '200000',
        amount: [{ denom: 'ugnot', amount: '1000000' }],
      },
      memo: '',
      chain_id: 'test-13',
      account_number: '2701052',
      sequence: '0',
    };

    const decoded = decodeTxMessages(documentToTx(document).messages);

    expect(decoded[0]).toMatchObject({
      '@type': MSG_CREATE_SESSION_ENDPOINT,
      creator: 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5',
      expires_at: '0',
      allow_paths: ['bank/send'],
    });
    expect(decoded[0]).not.toHaveProperty('spend_limit');
    expect(decoded[0]).not.toHaveProperty('spend_period');
  });
});
