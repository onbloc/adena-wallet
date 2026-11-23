import { Any } from '@gnolang/gno-js-client';
import { Tx } from '@gnolang/tm2-js-client';

import { GnoMessage } from '../../../../../src/repositories/chain/gno/gno-messages';
import {
  netStorageDeposit,
  readEventFee,
  requiresSignedSimulation,
  simulateGnoTx,
  staticCodeGasUsed,
  toSimulationError,
} from '../../../../../src/repositories/chain/gno/gno-simulation';
import { buildUnsignedGnoTx } from '../../../../../src/repositories/chain/gno/gno-tx-encoder';
import { createFakeGnoProvider, simulateAbciResponse } from '../../../../helpers/fake-gno-provider';

const varint = (value: number): number[] => {
  const out: number[] = [];
  let rest = value;

  while (rest >= 0x80) {
    out.push((rest % 0x80) | 0x80);
    rest = Math.floor(rest / 0x80);
  }

  out.push(rest);
  return out;
};

const lengthField = (field: number, text: string): number[] => {
  const bytes = [...new TextEncoder().encode(text)];

  return [...varint(field * 8 + 2), ...varint(bytes.length), ...bytes];
};

const varintField = (field: number, value: number): number[] => [...varint(field * 8), ...varint(value)];

// StorageDepositEvent / StorageUnlockEvent: bytes (1, varint), fee (2, string), pkg_path (3, string).
const storageEvent = (typeUrl: string, fee: string, bytes = 1234): Any => Any.create({
  type_url: typeUrl,
  value: new Uint8Array([...varintField(1, bytes), ...lengthField(2, fee), ...lengthField(3, 'gno.land/r/demo/x')]),
});

const CALLER = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';
const runMessage = (body: string): GnoMessage => ({
  type: '/vm.m_run',
  value: { caller: CALLER, send: '', max_deposit: '', package: { name: 'main', path: '', files: [{ name: 'main.gno', body }] } },
});
const addPkgMessage: GnoMessage = {
  type: '/vm.m_addpkg',
  value: { creator: CALLER, send: '', max_deposit: '', package: { name: 'x', path: 'gno.land/r/demo/x', files: [{ name: 'x.gno', body: 'package x' }] } },
};
const callMessage: GnoMessage = {
  type: '/vm.m_call',
  value: { caller: CALLER, send: '', max_deposit: '', pkg_path: 'gno.land/r/demo/x', func: 'Do', args: null },
};
const sendMessage: GnoMessage = { type: '/bank.MsgSend', value: { from_address: CALLER, to_address: CALLER, amount: '1ugnot' } };

describe('readEventFee', () => {
  it('reads field 2 and skips varint and other length-delimited fields', () => {
    expect(readEventFee(storageEvent('/tm.StorageDepositEvent', '500ugnot').value)).toBe('500ugnot');
  });

  it('handles multi-byte varints and lengths', () => {
    const longFee = `${'9'.repeat(200)}ugnot`;

    expect(readEventFee(new Uint8Array([...varintField(1, 300_000), ...lengthField(2, longFee)]))).toBe(longFee);
  });

  it('keeps the last field 2 when repeated', () => {
    expect(readEventFee(new Uint8Array([...lengthField(2, '1ugnot'), ...lengthField(2, '2ugnot')]))).toBe('2ugnot');
  });

  it('returns an empty string for empty input or when field 2 is absent', () => {
    expect(readEventFee(new Uint8Array())).toBe('');
    expect(readEventFee(new Uint8Array(varintField(1, 5)))).toBe('');
  });

  it('stops at unsupported wire types', () => {
    // Field 1 with wire type 1 (fixed64) precedes the fee.
    expect(readEventFee(new Uint8Array([0x09, ...lengthField(2, '1ugnot')]))).toBe('');
    expect(readEventFee(new Uint8Array([...lengthField(2, '3ugnot'), 0x0d, 0, 0, 0, 0]))).toBe('3ugnot');
  });

  it('throws on a truncated varint', () => {
    expect(() => readEventFee(new Uint8Array([0x08, 0x80]))).toThrow('truncated varint');
    expect(() => readEventFee(new Uint8Array([0x80]))).toThrow('truncated varint');
  });
});

describe('netStorageDeposit', () => {
  it('sums deposits minus unlocks in the native denom', () => {
    const events = [
      storageEvent('/tm.StorageDepositEvent', '1500ugnot'),
      storageEvent('/tm.StorageDepositEvent', '500ugnot'),
      storageEvent('/tm.StorageUnlockEvent', '300ugnot'),
    ];

    expect(netStorageDeposit(events, 'ugnot')).toBe('1700');
  });

  it('never goes negative', () => {
    expect(netStorageDeposit([storageEvent('/tm.StorageUnlockEvent', '300ugnot')], 'ugnot')).toBe('0');
  });

  it('ignores other denoms, malformed coins and unrelated events', () => {
    const events = [
      storageEvent('/tm.StorageDepositEvent', '100foo'),
      storageEvent('/tm.StorageDepositEvent', 'garbage'),
      storageEvent('/tm.StorageDepositEvent', ''),
      Any.create({ type_url: '/tm.OtherEvent', value: new Uint8Array(lengthField(2, '999ugnot')) }),
    ];

    expect(netStorageDeposit(events, 'ugnot')).toBe('0');
    expect(netStorageDeposit([], 'ugnot')).toBe('0');
  });

  it('keeps precision for huge amounts', () => {
    expect(netStorageDeposit([storageEvent('/tm.StorageDepositEvent', '123456789012345678901234567890ugnot')], 'ugnot'))
      .toBe('123456789012345678901234567890');
  });
});

describe('toSimulationError', () => {
  it('keeps the message of known tm2 errors', () => {
    const error = toSimulationError('/std.OutOfGasError', 'out of gas in location: x');

    expect(error.message).not.toMatch(/^unknown error/);
    expect(error.constructor.name).toBe('OutOfGasError');
    expect((error as Error & { log?: string }).log).toBe('out of gas in location: x');
  });

  it('extracts a VM panic reason', () => {
    const error = toSimulationError('/vm.VMError', 'msg:0,success:false,log:--= Error =--\nVM panic: insufficient balance\nstack');

    expect(error.message).toBe('insufficient balance');
    expect((error as Error & { log?: string }).log).toContain('VM panic');
  });

  it('extracts a line-level panic', () => {
    expect(toSimulationError('/vm.VMError', 'something\npanic: not owner\nmore').message).toBe('not owner');
  });

  it('extracts recovered StringError reasons', () => {
    const log = '--= Error =--\nData: recovered: unauthorized caller\nMsg Traces:';

    expect(toSimulationError('/std.StringError', log).message).toBe('unauthorized caller');
  });

  it('falls back to the first meaningful log line', () => {
    expect(toSimulationError('/vm.InvalidPkgPathError', '\n  --= Error =--\nmsg: 0\n  invalid package path  \nmore').message)
      .toBe('invalid package path');
  });

  it('falls back to the type url when the log is empty', () => {
    expect(toSimulationError('/vm.InvalidPkgPathError', '').message).toBe('/vm.InvalidPkgPathError');
    expect(toSimulationError('/vm.InvalidPkgPathError', '--= Error =--\nmsg: 1').message).toBe('/vm.InvalidPkgPathError');
  });
});

describe('simulateGnoTx', () => {
  const tx = buildUnsignedGnoTx([sendMessage], { gasWanted: '100000000', gasFee: '1ugnot' }, '');

  it('sends the tx bytes and returns gas used and storage deposit', async () => {
    const { provider, state } = createFakeGnoProvider({
      simulate: () => ({ gas_used: 123_456n, response_base: { events: [storageEvent('/tm.StorageDepositEvent', '42ugnot')], data: new Uint8Array(), log: '', info: '' } }),
    });

    await expect(simulateGnoTx(provider, tx, 'ugnot')).resolves.toEqual({ gasUsed: 123_456n, storageDeposit: '42' });
    expect(Tx.encode(state.simulated[0]).finish()).toEqual(Tx.encode(tx).finish());
  });

  it('defaults to a zero deposit without a response base', async () => {
    const { provider } = createFakeGnoProvider({ gasUsed: 7n });

    await expect(simulateGnoTx(provider, tx, 'ugnot')).resolves.toEqual({ gasUsed: 7n, storageDeposit: '0' });
  });

  it('throws the decoded abci error', async () => {
    const { provider } = createFakeGnoProvider({
      simulate: () => ({
        response_base: {
          error: Any.create({ type_url: '/vm.VMError', value: new Uint8Array() }),
          log: 'VM panic: boom',
          data: new Uint8Array(),
          events: [],
          info: '',
        },
      }),
    });

    await expect(simulateGnoTx(provider, tx, 'ugnot')).rejects.toThrow('boom');
  });

  it('propagates query-level errors and malformed responses', async () => {
    const { provider } = createFakeGnoProvider();
    const mutable = provider as unknown as { abciQuery: (...args: unknown[]) => Promise<unknown> };

    mutable.abciQuery = async () => ({ response: { ResponseBase: { Error: { '@type': '/std.InternalError', value: '/std.InternalError' }, Log: 'oops' } } });
    await expect(simulateGnoTx(provider, tx, 'ugnot')).rejects.toBeInstanceOf(Error);

    mutable.abciQuery = async () => ({ response: { ResponseBase: {}, Value: null } });
    await expect(simulateGnoTx(provider, tx, 'ugnot')).rejects.toThrow('abci data is not initialized');

    mutable.abciQuery = async () => simulateAbciResponse({ gas_used: 1n });
    await expect(simulateGnoTx(provider, tx, 'ugnot')).resolves.toMatchObject({ gasUsed: 1n });
  });
});

describe('requiresSignedSimulation', () => {
  it('is true only for code-bearing messages', () => {
    expect(requiresSignedSimulation([sendMessage, callMessage])).toBe(false);
    expect(requiresSignedSimulation([])).toBe(false);
    expect(requiresSignedSimulation([callMessage, runMessage('package main')])).toBe(true);
    expect(requiresSignedSimulation([addPkgMessage])).toBe(true);
  });
});

describe('staticCodeGasUsed', () => {
  it('uses the extension static table', () => {
    expect(staticCodeGasUsed([addPkgMessage])).toBe(1_000_000_000n);
    expect(staticCodeGasUsed([runMessage('package main\nfunc main() {}')])).toBe(1_000_000_000n);
    expect(staticCodeGasUsed([runMessage('import grc20reg "x"\ngrc20reg.Transfer(0, cur)')])).toBe(50_000_000n);
  });

  it('requires both the registry import and the transfer call for the cheap rate', () => {
    expect(staticCodeGasUsed([runMessage('grc20reg only')])).toBe(1_000_000_000n);
    expect(staticCodeGasUsed([runMessage('x.Transfer(1)')])).toBe(1_000_000_000n);
  });

  it('sums code messages and ignores the rest', () => {
    expect(staticCodeGasUsed([addPkgMessage, runMessage('grc20reg .Transfer('), callMessage, sendMessage])).toBe(1_050_000_000n);
    expect(staticCodeGasUsed([callMessage, sendMessage])).toBe(0n);
    expect(staticCodeGasUsed([])).toBe(0n);
  });
});
