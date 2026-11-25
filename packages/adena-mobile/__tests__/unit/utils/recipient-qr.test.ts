import { toBech32 } from '@cosmjs/encoding';

import { ChainFamily } from '../../../src/domain/network';
import { normalizeAddress } from '../../../src/utils/address';
import { extractQrAddress, parseRecipientQr } from '../../../src/utils/recipient-qr';

const GNO = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';
const ATONE = toBech32('atone', new Uint8Array(20).fill(1));
const GNO_NET = { family: ChainFamily.GNO, addressPrefix: 'g' };
const ATONE_NET = { family: ChainFamily.COSMOS, addressPrefix: 'atone' };
const gno = (payload: string) => parseRecipientQr(payload, GNO_NET, value => normalizeAddress(value, 'g'));
const atone = (payload: string) => parseRecipientQr(payload, ATONE_NET, value => normalizeAddress(value, 'atone'));

describe('extractQrAddress', () => {
  it('keeps a plain address and trims whitespace', () => {
    expect(extractQrAddress(`  ${GNO}\n`)).toEqual({ address: GNO, hasParams: false });
  });

  it('strips the scheme, an optional authority slash pair and the query', () => {
    expect(extractQrAddress(`gno:${GNO}`)).toEqual({ address: GNO, scheme: 'gno', hasParams: false });
    expect(extractQrAddress(`GNO:${GNO}?amount=1&denom=ugnot`)).toEqual({ address: GNO, scheme: 'gno', hasParams: true });
    expect(extractQrAddress(`cosmos://${ATONE}?memo=hi`)).toEqual({ address: ATONE, scheme: 'cosmos', hasParams: true });
  });
});

describe('parseRecipientQr', () => {
  it('accepts the plain address the Receive page encodes', () => {
    expect(gno(GNO)).toEqual({ address: GNO, ignoredParams: false });
  });

  it('accepts URI forms for the current chain family and flags ignored parameters', () => {
    expect(gno(`gno:${GNO}?amount=10`)).toEqual({ address: GNO, ignoredParams: true });
    expect(gno(`gnoland:${GNO}`)).toEqual({ address: GNO, ignoredParams: false });
    expect(atone(`atone:${ATONE}`)).toEqual({ address: ATONE, ignoredParams: false });
    expect(atone(` cosmos:${ATONE} `)).toEqual({ address: ATONE, ignoredParams: false });
    expect(atone(`atomone:${ATONE}`)).toEqual({ address: ATONE, ignoredParams: false });
  });

  it('returns the canonical lowercase address for an all-uppercase QR', () => {
    expect(gno(`GNO:${GNO.toUpperCase()}`)).toEqual({ address: GNO, ignoredParams: false });
    expect(gno(GNO.toUpperCase())).toEqual({ address: GNO, ignoredParams: false });
  });

  it('rejects schemes of another chain family', () => {
    expect(gno(`cosmos:${GNO}`)).toBeNull();
    expect(gno(`atone:${GNO}`)).toBeNull();
    expect(atone(`gno:${ATONE}`)).toBeNull();
  });

  it('rejects addresses of another chain, mixed case, garbage and empty payloads', () => {
    expect(gno(ATONE)).toBeNull();
    expect(atone(`gno:${GNO}`)).toBeNull();
    expect(gno(`G${GNO.slice(1)}`)).toBeNull();
    expect(gno('https://example.com')).toBeNull();
    expect(gno('gno:')).toBeNull();
    expect(gno('   ')).toBeNull();
  });
});
