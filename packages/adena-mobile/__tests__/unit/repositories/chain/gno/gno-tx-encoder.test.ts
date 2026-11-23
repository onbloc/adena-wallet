import { toHex } from '@cosmjs/encoding';
import { MsgAddPackage, MsgCall, MsgRun, MsgSend } from '@gnolang/gno-js-client';
import { PubKeySecp256k1, Tx } from '@gnolang/tm2-js-client';
import { documentToTx } from 'adena-module';

import { GnoMessage } from '../../../../../src/repositories/chain/gno/gno-messages';
import { buildSimulationGnoTx, buildUnsignedGnoTx, encodeGnoMessage } from '../../../../../src/repositories/chain/gno/gno-tx-encoder';

const CALLER = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';
const memPackage = { name: 'main', path: 'gno.land/r/demo/x', files: [{ name: 'a.gno', body: 'package main' }, { name: 'b.gno', body: '// 한글' }] };

const messages: Record<string, GnoMessage> = {
  send: { type: '/bank.MsgSend', value: { from_address: CALLER, to_address: CALLER, amount: '1000ugnot' } },
  call: { type: '/vm.m_call', value: { caller: CALLER, send: '5ugnot', max_deposit: '10ugnot', pkg_path: 'gno.land/r/demo/x', func: 'Do', args: ['a', ''] } },
  callNoArgs: { type: '/vm.m_call', value: { caller: CALLER, send: '', max_deposit: '', pkg_path: 'gno.land/r/demo/x', func: 'Do', args: [] } },
  callNullArgs: { type: '/vm.m_call', value: { caller: CALLER, send: '', max_deposit: '', pkg_path: 'gno.land/r/demo/x', func: 'Do', args: null } },
  addpkg: { type: '/vm.m_addpkg', value: { creator: CALLER, send: '', max_deposit: '1ugnot', package: memPackage } },
  run: { type: '/vm.m_run', value: { caller: CALLER, send: '1ugnot', max_deposit: '', package: { ...memPackage, path: '' } } },
};

const reference = (msgs: GnoMessage[], memo = ''): Uint8Array => Tx.encode(documentToTx({
  chain_id: 'test-chain',
  account_number: '0',
  sequence: '0',
  fee: { amount: [{ amount: '200', denom: 'ugnot' }], gas: '200000' },
  msgs,
  memo,
})).finish();

const FEE = { gasWanted: '200000', gasFee: '200ugnot' };

describe('encodeGnoMessage', () => {
  it.each(Object.entries(messages))('encodes %s byte-for-byte like adena-module', (_, message) => {
    expect(toHex(Tx.encode(buildUnsignedGnoTx([message], FEE, 'memo')).finish())).toBe(toHex(reference([message], 'memo')));
  });

  it('round-trips through the protobuf decoders', () => {
    const send = encodeGnoMessage(messages.send);
    const call = encodeGnoMessage(messages.call);
    const addpkg = encodeGnoMessage(messages.addpkg);
    const run = encodeGnoMessage(messages.run);

    expect(send.type_url).toBe('/bank.MsgSend');
    expect(MsgSend.decode(send.value)).toMatchObject({ from_address: CALLER, amount: '1000ugnot' });
    expect(MsgCall.decode(call.value)).toMatchObject({ send: '5ugnot', max_deposit: '10ugnot', func: 'Do', args: ['a', ''] });
    expect(MsgAddPackage.decode(addpkg.value).package).toMatchObject({ name: 'main', path: 'gno.land/r/demo/x', files: memPackage.files });
    expect(MsgRun.decode(run.value)).toMatchObject({ caller: CALLER, send: '1ugnot', package: { path: '' } });
  });

  it('defaults missing coin fields to empty strings', () => {
    const loose = { send: undefined, max_deposit: undefined } as unknown as { send: string; max_deposit: string };
    const addpkg = { ...messages.addpkg, value: { ...(messages.addpkg.value as object), ...loose } } as GnoMessage;
    const run = { ...messages.run, value: { ...(messages.run.value as object), ...loose } } as GnoMessage;
    const call = { ...messages.call, value: { ...(messages.call.value as object), ...loose } } as GnoMessage;

    expect(MsgAddPackage.decode(encodeGnoMessage(addpkg).value)).toMatchObject({ send: '', max_deposit: '' });
    expect(MsgRun.decode(encodeGnoMessage(run).value)).toMatchObject({ send: '', max_deposit: '' });
    expect(MsgCall.decode(encodeGnoMessage(call).value)).toMatchObject({ send: '', max_deposit: '' });
  });

  it('omits empty argument lists', () => {
    expect(MsgCall.decode(encodeGnoMessage(messages.callNoArgs).value).args).toEqual([]);
    expect(encodeGnoMessage(messages.callNoArgs).value).toEqual(encodeGnoMessage(messages.callNullArgs).value);
  });
});

describe('buildUnsignedGnoTx', () => {
  it('encodes every message in order with the fee and memo and no signatures', () => {
    const tx = buildUnsignedGnoTx(Object.values(messages), { gasWanted: '9007199254740993', gasFee: '1ugnot' }, 'hello');
    const decoded = Tx.decode(Tx.encode(tx).finish());

    expect(decoded.messages.map(message => message.type_url)).toEqual(Object.values(messages).map(message => message.type));
    expect(decoded.fee?.gas_wanted).toBe(9007199254740993n);
    expect(decoded.fee?.gas_fee).toBe('1ugnot');
    expect(decoded.memo).toBe('hello');
    expect(decoded.signatures).toEqual([]);
  });

  it('rejects non-integer gas', () => {
    expect(() => buildUnsignedGnoTx([], { gasWanted: '1.5', gasFee: '1ugnot' }, '')).toThrow();
  });
});

describe('buildSimulationGnoTx', () => {
  it('attaches the public key with an empty signature', () => {
    const publicKey = new Uint8Array(33).fill(2);
    const tx = Tx.decode(Tx.encode(buildSimulationGnoTx([messages.send], FEE, 'm', publicKey)).finish());

    expect(tx.signatures).toHaveLength(1);
    expect(tx.signatures[0].signature).toEqual(new Uint8Array());
    expect(tx.signatures[0].pub_key?.type_url).toBe('/tm.PubKeySecp256k1');
    expect(PubKeySecp256k1.decode(tx.signatures[0].pub_key!.value).key).toEqual(publicKey);
    expect(tx.memo).toBe('m');
  });
});
