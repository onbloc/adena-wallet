import { toBech32 } from '@cosmjs/encoding';

import { isValidAddress } from '../../../src/utils/address';
import { extractQrAddress, parseRecipientQr } from '../../../src/utils/recipient-qr';

const GNO = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';
const ATONE = toBech32('atone', new Uint8Array(20).fill(1));
const isGno = (value: string): boolean => isValidAddress(value, 'g');
const isAtone = (value: string): boolean => isValidAddress(value, 'atone');

describe('extractQrAddress', () => {
  it('keeps a plain address and trims whitespace', () => {
    expect(extractQrAddress(`  ${GNO}\n`)).toBe(GNO);
  });

  it('strips the scheme, an optional authority slash pair and the query', () => {
    expect(extractQrAddress(`gno:${GNO}`)).toBe(GNO);
    expect(extractQrAddress(`GNO:${GNO}?amount=1&denom=ugnot`)).toBe(GNO);
    expect(extractQrAddress(`cosmos://${ATONE}?memo=hi`)).toBe(ATONE);
  });
});

describe('parseRecipientQr', () => {
  it('accepts the plain address the Receive page encodes', () => {
    expect(parseRecipientQr(GNO, isGno)).toBe(GNO);
  });

  it('accepts URI forms for the current chain family', () => {
    expect(parseRecipientQr(`gno:${GNO}?amount=10`, isGno)).toBe(GNO);
    expect(parseRecipientQr(`atone:${ATONE}`, isAtone)).toBe(ATONE);
    expect(parseRecipientQr(` cosmos:${ATONE} `, isAtone)).toBe(ATONE);
  });

  it('rejects addresses of another chain, garbage and empty payloads', () => {
    expect(parseRecipientQr(ATONE, isGno)).toBeNull();
    expect(parseRecipientQr(`gno:${GNO}`, isAtone)).toBeNull();
    expect(parseRecipientQr('https://example.com', isGno)).toBeNull();
    expect(parseRecipientQr('gno:', isGno)).toBeNull();
    expect(parseRecipientQr('   ', isGno)).toBeNull();
  });
});
