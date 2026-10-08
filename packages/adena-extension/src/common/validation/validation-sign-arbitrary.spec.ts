import { MAX_ARBITRARY_MESSAGE_BYTES } from '@inject/types';
import { validateSignArbitraryParams } from './validation-sign-arbitrary';

const SIGNER = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';

describe('validateSignArbitraryParams', () => {
  it('accepts a well-formed request', () => {
    expect(validateSignArbitraryParams({ signer: SIGNER, data: 'hello' })).toBe(true);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'hello'],
    ['a missing signer', { data: 'hello' }],
    ['a missing message', { signer: SIGNER }],
    ['a non-string signer', { signer: 1, data: 'hello' }],
    ['a non-string message', { signer: SIGNER, data: 1 }],
    ['an address that is not bech32', { signer: 'not-an-address', data: 'hello' }],
  ])('rejects %s', (_label, params) => {
    expect(validateSignArbitraryParams(params)).toBe(false);
  });

  // An empty message would produce a signature over a document that asserts
  // nothing, and ADR-036 verifiers reject empty data outright.
  it('rejects an empty message', () => {
    expect(validateSignArbitraryParams({ signer: SIGNER, data: '' })).toBe(false);
  });

  it('accepts a message at the size limit', () => {
    const data = 'x'.repeat(MAX_ARBITRARY_MESSAGE_BYTES);
    expect(validateSignArbitraryParams({ signer: SIGNER, data })).toBe(true);
  });

  it('rejects a message over the size limit', () => {
    const data = 'x'.repeat(MAX_ARBITRARY_MESSAGE_BYTES + 1);
    expect(validateSignArbitraryParams({ signer: SIGNER, data })).toBe(false);
  });

  // The cap exists to protect a URL budget that is spent in bytes, so a
  // character count would let a multi-byte message through at several times
  // the intended size.
  it('measures the limit in UTF-8 bytes, not characters', () => {
    const data = '🔑'.repeat(MAX_ARBITRARY_MESSAGE_BYTES / 4 + 1);
    expect(data.length).toBeLessThan(MAX_ARBITRARY_MESSAGE_BYTES);
    expect(validateSignArbitraryParams({ signer: SIGNER, data })).toBe(false);
  });
});
