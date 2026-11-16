import { fromBech32 } from '../encoding';
import { publicKeyToAddress, secp256k1PubKeyToAddress, secp256k1PubKeyToAddressBytes } from './address';

// A known secp256k1 compressed public key (33 bytes) used as a stable test fixture
const TEST_PUBLIC_KEY = new Uint8Array([
  0x02, 0xc6, 0x04, 0x7f, 0x94, 0x41, 0xed, 0x7d,
  0x6d, 0x30, 0x45, 0x40, 0x6e, 0x95, 0xc0, 0x7c,
  0xd8, 0x5c, 0x77, 0x8e, 0x4b, 0x8c, 0xef, 0x3c,
  0xa7, 0xab, 0xac, 0x09, 0xb9, 0x5c, 0x70, 0x9e,
  0xe5,
]);

describe('publicKeyToAddress', () => {
  it('produces a g1... address with g prefix', async () => {
    const address = await publicKeyToAddress(TEST_PUBLIC_KEY, 'g');
    expect(address).toMatch(/^g1/);
  });
});

describe('secp256k1PubKeyToAddress', () => {
  it('produces a g1... address with g prefix', () => {
    const address = secp256k1PubKeyToAddress(TEST_PUBLIC_KEY, 'g');
    expect(address).toMatch(/^g1/);
  });

  it('produces an atone1... address with atone prefix', () => {
    const address = secp256k1PubKeyToAddress(TEST_PUBLIC_KEY, 'atone');
    expect(address).toMatch(/^atone1/);
  });

  it('same public key produces different address strings for different prefixes', () => {
    const gnoAddress = secp256k1PubKeyToAddress(TEST_PUBLIC_KEY, 'g');
    const atoneAddress = secp256k1PubKeyToAddress(TEST_PUBLIC_KEY, 'atone');
    expect(gnoAddress).not.toBe(atoneAddress);
  });

  it('20-byte address data is identical regardless of prefix', () => {
    const gnoAddress = secp256k1PubKeyToAddress(TEST_PUBLIC_KEY, 'g');
    const atoneAddress = secp256k1PubKeyToAddress(TEST_PUBLIC_KEY, 'atone');
    const gnoBytes = fromBech32(gnoAddress).data;
    const atoneBytes = fromBech32(atoneAddress).data;
    expect(gnoBytes).toEqual(atoneBytes);
  });

  it('decoded bech32 data matches secp256k1PubKeyToAddressBytes output', () => {
    const rawBytes = secp256k1PubKeyToAddressBytes(TEST_PUBLIC_KEY);
    const address = secp256k1PubKeyToAddress(TEST_PUBLIC_KEY, 'g');
    const decodedBytes = fromBech32(address).data;
    expect(rawBytes).toEqual(decodedBytes);
  });
});
