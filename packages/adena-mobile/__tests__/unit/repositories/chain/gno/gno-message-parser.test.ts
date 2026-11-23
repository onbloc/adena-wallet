import { AppError } from '../../../../../src/core/errors';
import { parseGnoMessages } from '../../../../../src/repositories/chain/gno/gno-message-parser';

const SIGNER = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';
const OTHER = 'g1other';
const pkg = { name: 'main', path: 'gno.land/r/demo/x', files: [{ name: 'main.gno', body: 'package main' }] };

const errorOf = (raw: unknown, signer = SIGNER): AppError => {
  try {
    parseGnoMessages(raw as unknown[], signer);
  }
  catch (error) {
    return error as AppError;
  }

  throw new Error('expected parseGnoMessages to throw');
};

const expectInvalid = (raw: unknown, message: string | RegExp): void => {
  const error = errorOf(raw);

  expect(error).toBeInstanceOf(AppError);
  expect(error.code).toBe('INVALID_REQUEST');
  expect(error.message).toMatch(message);
};

describe('parseGnoMessages', () => {
  describe('envelope', () => {
    it.each([
      ['not an array', 'nope'],
      ['undefined', undefined],
      ['empty', []],
      ['too many messages', Array.from({ length: 17 }, () => ({}))],
    ])('rejects %s', (_, raw) => {
      expectInvalid(raw, 'messages must be a non-empty array');
    });

    it('accepts up to 16 messages', () => {
      const send = { type: '/bank.MsgSend', value: { from_address: SIGNER, to_address: OTHER, amount: '1ugnot' } };

      expect(parseGnoMessages(Array.from({ length: 16 }, () => send), SIGNER)).toHaveLength(16);
    });

    it.each([null, 'x', 1, [1]])('rejects a non-object message %p', (message) => {
      expectInvalid([message], 'message must be an object');
    });

    it('rejects a missing or array value', () => {
      expectInvalid([{ type: '/bank.MsgSend' }], 'message.value must be an object');
      expectInvalid([{ type: '/bank.MsgSend', value: [] }], 'message.value must be an object');
    });

    it.each(['/auth.m_create_session', '/vm.m_enable_package', undefined, 42])('rejects unsupported type %p', (type) => {
      const error = errorOf([{ type, value: {} }]);

      expect(error.code).toBe('UNSUPPORTED_MESSAGE');
      expect(error.message).toBe(`Unsupported message type: ${String(type)}`);
    });
  });

  describe('/bank.MsgSend', () => {
    it('parses a valid send', () => {
      expect(parseGnoMessages([{ type: '/bank.MsgSend', value: { from_address: SIGNER, to_address: OTHER, amount: '1000ugnot,5foo' } }], SIGNER))
        .toEqual([{ type: '/bank.MsgSend', value: { from_address: SIGNER, to_address: OTHER, amount: '1000ugnot,5foo' } }]);
    });

    it('rejects a signer mismatch', () => {
      expectInvalid([{ type: '/bank.MsgSend', value: { from_address: OTHER, to_address: SIGNER, amount: '1ugnot' } }], 'from_address does not match the selected account');
    });

    it('rejects a missing or non-string from_address', () => {
      expectInvalid([{ type: '/bank.MsgSend', value: { to_address: OTHER, amount: '1ugnot' } }], 'from_address is required');
      expectInvalid([{ type: '/bank.MsgSend', value: { from_address: 1, to_address: OTHER, amount: '1ugnot' } }], 'from_address must be a string');
    });

    it('rejects a missing to_address', () => {
      expectInvalid([{ type: '/bank.MsgSend', value: { from_address: SIGNER, to_address: null, amount: '1ugnot' } }], 'to_address is required');
    });

    it('requires a non-empty, well-formed amount', () => {
      expectInvalid([{ type: '/bank.MsgSend', value: { from_address: SIGNER, to_address: OTHER } }], 'amount is required');
      expectInvalid([{ type: '/bank.MsgSend', value: { from_address: SIGNER, to_address: OTHER, amount: '' } }], 'amount is required');
      expectInvalid([{ type: '/bank.MsgSend', value: { from_address: SIGNER, to_address: OTHER, amount: '1.5ugnot' } }], 'amount must be a coin list');
      expectInvalid([{ type: '/bank.MsgSend', value: { from_address: SIGNER, to_address: OTHER, amount: '1ugnot,' } }], 'amount must be a coin list');
      expectInvalid([{ type: '/bank.MsgSend', value: { from_address: SIGNER, to_address: OTHER, amount: 5 } }], 'amount must be a string');
    });
  });

  describe('/vm.m_call', () => {
    const base = { caller: SIGNER, pkg_path: 'gno.land/r/demo/x', func: 'Do' };

    it('defaults optional coins and args', () => {
      expect(parseGnoMessages([{ type: '/vm.m_call', value: { ...base, args: null, send: null } }], SIGNER)[0].value)
        .toEqual({ ...base, send: '', max_deposit: '', args: null });
    });

    it('keeps args, send and max_deposit', () => {
      expect(parseGnoMessages([{ type: '/vm.m_call', value: { ...base, args: ['1', ''], send: '1ugnot', max_deposit: '2ugnot' } }], SIGNER)[0].value)
        .toEqual({ ...base, send: '1ugnot', max_deposit: '2ugnot', args: ['1', ''] });
      expect(parseGnoMessages([{ type: '/vm.m_call', value: { ...base, args: [] } }], SIGNER)[0].value).toMatchObject({ args: [] });
    });

    it('accepts 64 args and rejects more', () => {
      expect(parseGnoMessages([{ type: '/vm.m_call', value: { ...base, args: Array(64).fill('a') } }], SIGNER)[0].value).toMatchObject({ args: Array(64).fill('a') });
      expectInvalid([{ type: '/vm.m_call', value: { ...base, args: Array(65).fill('a') } }], 'args must be an array of strings');
    });

    it('rejects non-array args and non-string elements', () => {
      expectInvalid([{ type: '/vm.m_call', value: { ...base, args: 'a' } }], 'args must be an array of strings');
      expectInvalid([{ type: '/vm.m_call', value: { ...base, args: ['a', 2] } }], 'args[1] must be a string');
      expectInvalid([{ type: '/vm.m_call', value: { ...base, args: [null] } }], 'args[0] is required');
    });

    it('validates caller, package, function and coins', () => {
      expectInvalid([{ type: '/vm.m_call', value: { ...base, caller: OTHER } }], 'caller does not match');
      expectInvalid([{ type: '/vm.m_call', value: { ...base, pkg_path: undefined } }], 'pkg_path is required');
      expectInvalid([{ type: '/vm.m_call', value: { ...base, func: {} } }], 'func must be a string');
      expectInvalid([{ type: '/vm.m_call', value: { ...base, max_deposit: 'lots' } }], 'max_deposit must be a coin list');
    });
  });

  describe('/vm.m_addpkg', () => {
    it('parses a package', () => {
      expect(parseGnoMessages([{ type: '/vm.m_addpkg', value: { creator: SIGNER, package: pkg, send: '', max_deposit: '1ugnot' } }], SIGNER)[0])
        .toEqual({ type: '/vm.m_addpkg', value: { creator: SIGNER, send: '', max_deposit: '1ugnot', package: pkg } });
    });

    it('rejects a foreign creator', () => {
      expectInvalid([{ type: '/vm.m_addpkg', value: { creator: OTHER, package: pkg } }], 'creator does not match');
    });

    it('validates the package shape', () => {
      expectInvalid([{ type: '/vm.m_addpkg', value: { creator: SIGNER } }], 'package must be an object');
      expectInvalid([{ type: '/vm.m_addpkg', value: { creator: SIGNER, package: { ...pkg, files: 'x' } } }], 'package.files must be an array');
      expectInvalid([{ type: '/vm.m_addpkg', value: { creator: SIGNER, package: { ...pkg, files: [] } } }], 'package.files has an invalid length');
      expectInvalid([{ type: '/vm.m_addpkg', value: { creator: SIGNER, package: { ...pkg, files: Array(65).fill(pkg.files[0]) } } }], 'package.files has an invalid length');
      expectInvalid([{ type: '/vm.m_addpkg', value: { creator: SIGNER, package: { ...pkg, name: undefined } } }], 'package.name is required');
      expectInvalid([{ type: '/vm.m_addpkg', value: { creator: SIGNER, package: { ...pkg, path: 1 } } }], 'package.path must be a string');
      expectInvalid([{ type: '/vm.m_addpkg', value: { creator: SIGNER, package: { ...pkg, files: ['x'] } } }], 'package.files[0] must be an object');
      expectInvalid([{ type: '/vm.m_addpkg', value: { creator: SIGNER, package: { ...pkg, files: [{ body: '' }] } } }], 'package.files[0].name is required');
      expectInvalid([{ type: '/vm.m_addpkg', value: { creator: SIGNER, package: { ...pkg, files: [{ name: 'a' }] } } }], 'package.files[0].body is required');
    });

    it('accepts 64 files', () => {
      const files = Array.from({ length: 64 }, (_, index) => ({ name: `${index}.gno`, body: '' }));
      const [message] = parseGnoMessages([{ type: '/vm.m_addpkg', value: { creator: SIGNER, package: { ...pkg, files } } }], SIGNER);

      expect(message.type === '/vm.m_addpkg' && message.value.package.files).toHaveLength(64);
    });
  });

  describe('/vm.m_run', () => {
    it('parses a run and drops unknown fields', () => {
      const [message] = parseGnoMessages([{ type: '/vm.m_run', value: { caller: SIGNER, package: { ...pkg, extra: 1 }, send: '1ugnot', extra: true } }], SIGNER);

      expect(message).toEqual({ type: '/vm.m_run', value: { caller: SIGNER, send: '1ugnot', max_deposit: '', package: pkg } });
    });

    it('rejects a foreign caller and bad coins', () => {
      expectInvalid([{ type: '/vm.m_run', value: { caller: OTHER, package: pkg } }], 'caller does not match');
      expectInvalid([{ type: '/vm.m_run', value: { caller: SIGNER, package: pkg, send: '-1ugnot' } }], 'send must be a coin list');
    });
  });

  it('fails on the first invalid message in a batch', () => {
    const good = { type: '/bank.MsgSend', value: { from_address: SIGNER, to_address: OTHER, amount: '1ugnot' } };

    expectInvalid([good, { type: '/bank.MsgSend', value: { ...good.value, from_address: OTHER } }], 'from_address does not match');
  });
});
