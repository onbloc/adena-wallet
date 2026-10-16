import {isAddressForNetwork} from '../../src/core/address';
import {
  addressParts,
  formatGnot,
  parseGnotToUgnot,
} from '../../src/core/format';
import {delayAfter} from '../../src/core/unlock-throttle';
import {addressFromQr} from '../../src/screens/QrScanScreen';
import {
  isValidMnemonic,
  normalizeMnemonic,
} from '../../src/screens/onboarding/ImportWalletScreen';
import {looksLikeTransaction} from '../../src/approvals/SignArbitraryApproval';

jest.mock('react-native-vision-camera', () => ({}));

describe('amounts', () => {
  it('converts GNOT input to ugnot and rejects unusable amounts', () => {
    expect(parseGnotToUgnot('1.5')).toBe('1500000');
    expect(parseGnotToUgnot('0.000001')).toBe('1');
    expect(parseGnotToUgnot('0.0000001')).toBeNull();
    expect(parseGnotToUgnot('0')).toBeNull();
    expect(parseGnotToUgnot('-1')).toBeNull();
    expect(parseGnotToUgnot('1e3')).toBeNull();
  });

  it('formats ugnot as GNOT', () => {
    expect(formatGnot('1234567890')).toBe('1,234.56789 GNOT');
    expect(formatGnot(null)).toBe('-');
  });
});

describe('addresses', () => {
  const address = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';

  it('requires the network prefix', () => {
    expect(isAddressForNetwork(address, 'g')).toBe(true);
    expect(isAddressForNetwork(address, 'atone')).toBe(false);
    expect(isAddressForNetwork('g1notanaddress', 'g')).toBe(false);
  });

  it('splits addresses so both ends can be emphasized', () => {
    const parts = addressParts(address);
    expect(parts.head + parts.middle + parts.tail).toBe(address);
    expect(parts.tail).toHaveLength(6);
  });

  it('reads plain and URI-style QR payloads', () => {
    expect(addressFromQr(address)).toBe(address);
    expect(addressFromQr(`gno:${address}?amount=1`)).toBe(address);
  });
});

describe('recovery phrase', () => {
  it('normalizes spacing and case, then checks the BIP39 checksum', () => {
    const phrase =
      'source bonus chronic canvas draft south burst lottery vacant surface solve popular case indicate oppose farm nothing bullet exhibit title speed wink action roast';
    expect(
      isValidMnemonic(
        normalizeMnemonic(`  ${phrase.toUpperCase().replace(/ /g, '   ')}\n`),
      ),
    ).toBe(true);
    expect(isValidMnemonic(phrase.replace('roast', 'ocean'))).toBe(false);
  });
});

describe('unlock throttle', () => {
  it('allows five attempts, then doubles the wait up to one hour', () => {
    expect(delayAfter(4)).toBe(0);
    expect(delayAfter(5)).toBe(30_000);
    expect(delayAfter(6)).toBe(60_000);
    expect(delayAfter(20)).toBe(60 * 60_000);
  });
});

describe('arbitrary message check', () => {
  it('flags transaction-shaped payloads', () => {
    expect(looksLikeTransaction('{"chain_id":"test12","msgs":[]}')).toBe(true);
    expect(looksLikeTransaction('Sign in to gno.land at 2026-10-15')).toBe(
      false,
    );
  });
});
