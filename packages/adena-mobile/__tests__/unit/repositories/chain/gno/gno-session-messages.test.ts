import { toBase64, toHex } from '@cosmjs/encoding';
import { MsgCreateSession, MsgRevokeSession } from '@gnolang/gno-js-client';
import { PubKeySecp256k1, Tx } from '@gnolang/tm2-js-client';
import { decodeTxMessages as referenceDecode, documentToTx } from 'adena-module';

import { GnoMessage } from '../../../../../src/repositories/chain/gno/gno-messages';
import { buildGnoSignBytes, buildUnsignedGnoTx, encodeGnoMessage } from '../../../../../src/repositories/chain/gno/gno-tx-encoder';

const MASTER = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';
const SESSION_KEY = Uint8Array.from([0x02, ...new Array(32).fill(7)]);
const FEE = { gasWanted: '200000', gasFee: '200ugnot' };

const create = (overrides: Partial<{ spend_limit: string; spend_period: string; allow_paths: string[] }> = {}): GnoMessage => ({
  type: '/auth.m_create_session',
  value: {
    creator: MASTER,
    session_key: toBase64(SESSION_KEY),
    expires_at: '1790000000',
    allow_paths: ['vm/exec:gno.land/r/gnoswap/router', 'bank/send'],
    spend_limit: '5000000ugnot',
    spend_period: '86400',
    ...overrides,
  },
});

const revoke: GnoMessage = { type: '/auth.m_revoke_session', value: { creator: MASTER, session_key: toBase64(SESSION_KEY) } };
const revokeAll: GnoMessage = { type: '/auth.m_revoke_all_sessions', value: { creator: MASTER } };

// The extension's document form: the session key as a proto-wrapped Any.
const referenceMessage = (message: GnoMessage): { type: string; value: unknown } => {
  if (message.type === '/auth.m_revoke_all_sessions') {
    return message;
  }

  const value = message.value as { session_key: string };
  const sessionKey = { type_url: '/tm.PubKeySecp256k1', value: PubKeySecp256k1.encode({ key: SESSION_KEY }).finish() };

  return { type: message.type, value: { ...value, session_key: sessionKey } };
};

const reference = (messages: GnoMessage[]): Tx => documentToTx({
  chain_id: 'test-chain',
  account_number: '0',
  sequence: '0',
  fee: { amount: [{ amount: '200', denom: 'ugnot' }], gas: '200000' },
  msgs: messages.map(referenceMessage),
  memo: '',
});

const signedMessages = (messages: GnoMessage[]): unknown[] =>
  JSON.parse(new TextDecoder().decode(buildGnoSignBytes(buildUnsignedGnoTx(messages, FEE, ''), 'test-chain', '1', '2'))).msgs;

describe('session messages', () => {
  const cases: [string, GnoMessage][] = [
    ['create', create()],
    ['create with a lifetime cap', create({ spend_period: '0' })],
    ['create without spending', create({ spend_limit: '' })],
    ['revoke', revoke],
    ['revoke all', revokeAll],
  ];

  it.each(cases)('encodes %s byte-for-byte like adena-module', (_, message) => {
    expect(toHex(Tx.encode(buildUnsignedGnoTx([message], FEE, '')).finish())).toBe(toHex(Tx.encode(reference([message])).finish()));
  });

  it.each(cases)('signs %s with the amino JSON adena-module produces', (_, message) => {
    expect(signedMessages([message])).toEqual(referenceDecode(reference([message]).messages));
  });

  it('wraps the session key as a secp256k1 Any', () => {
    const decoded = MsgCreateSession.decode(encodeGnoMessage(create()).value);

    expect(decoded.session_key?.type_url).toBe('/tm.PubKeySecp256k1');
    expect(PubKeySecp256k1.decode(decoded.session_key!.value).key).toEqual(SESSION_KEY);
    expect(decoded.expires_at).toBe(1790000000n);
    expect(decoded.spend_period).toBe(86400n);
    expect(MsgRevokeSession.decode(encodeGnoMessage(revoke).value).creator).toBe(MASTER);
  });

  // The chain marks spend_limit and spend_period omitempty; expires_at is always present.
  it('drops empty omitempty fields from the sign payload', () => {
    const [message] = signedMessages([create({ spend_limit: '', spend_period: '0' })]) as Record<string, unknown>[];

    expect(message).not.toHaveProperty('spend_limit');
    expect(message).not.toHaveProperty('spend_period');
    expect(message.expires_at).toBe('1790000000');
    expect(message.session_key).toEqual({ '@type': '/tm.PubKeySecp256k1', value: toBase64(SESSION_KEY) });
  });
});
