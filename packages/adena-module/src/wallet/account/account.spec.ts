import { makeAccount } from './account';
import { SeedAccount } from './seed-account';
import { LedgerAccount } from './ledger-account';
import { SingleAccount } from './single-account';
import { AirgapAccount } from './airgap-account';
import { MultisigAccount } from './multisig-account';
import { secp256k1PubKeyToAddressBytes } from '../../utils/address';

// Fixed compressed secp256k1 public key for deterministic tests
const TEST_PUBLIC_KEY = [
  2, 166, 122, 96, 148, 55, 234, 211, 60, 58, 186, 188, 53, 82, 114, 229, 244, 40, 232, 63, 44,
  159, 93, 198, 72, 130, 163, 64, 100, 45, 245, 181, 154,
];

function makeAddressBytes(): number[] {
  return Array.from(secp256k1PubKeyToAddressBytes(Uint8Array.from(TEST_PUBLIC_KEY)));
}

const BASE_SEED_INFO = {
  index: 0,
  type: 'HD_WALLET' as const,
  name: 'Account 1',
  keyringId: 'keyring-1',
  hdPath: 0,
  publicKey: TEST_PUBLIC_KEY,
};

const BASE_SINGLE_INFO = {
  index: 0,
  type: 'PRIVATE_KEY' as const,
  name: 'Account 1',
  keyringId: 'keyring-1',
  publicKey: TEST_PUBLIC_KEY,
};

const BASE_LEDGER_INFO = {
  index: 0,
  type: 'LEDGER' as const,
  name: 'Account 1',
  keyringId: 'keyring-1',
  hdPath: 0,
  publicKey: TEST_PUBLIC_KEY,
};

const BASE_MULTISIG_INFO = {
  index: 0,
  type: 'MULTISIG' as const,
  name: 'Multisig 1',
  keyringId: 'keyring-ms',
  publicKey: [],
  addressBytes: makeAddressBytes(),
  multisigConfig: { signers: ['g1aaa', 'g1bbb'], threshold: 2 },
  signerPublicKeys: [
    { address: 'g1aaa', publicKey: { '@type': '/cosmos.crypto.secp256k1.PubKey', value: 'abc' } },
    { address: 'g1bbb', publicKey: { '@type': '/cosmos.crypto.secp256k1.PubKey', value: 'def' } },
  ],
};

describe('SeedAccount.getAddress', () => {
  it('returns an address with the given bech32 prefix', async () => {
    const account = new SeedAccount(BASE_SEED_INFO);
    const gAddress = await account.getAddress('g');
    const atoneAddress = await account.getAddress('atone');
    expect(gAddress).toMatch(/^g1/);
    expect(atoneAddress).toMatch(/^atone1/);
    expect(gAddress).not.toBe(atoneAddress);
  });
});

describe('LedgerAccount.getAddress', () => {
  it('returns a bech32 address for the given prefix', async () => {
    const account = new LedgerAccount(BASE_LEDGER_INFO);
    const address = await account.getAddress('g');
    expect(address).toMatch(/^g1/);
  });
});

describe('SingleAccount.getAddress', () => {
  it('returns a bech32 address for the given prefix', async () => {
    const account = new SingleAccount(BASE_SINGLE_INFO);
    const address = await account.getAddress('g');
    expect(address).toMatch(/^g1/);
  });
});

describe('AirgapAccount.getAddress', () => {
  it('returns a bech32 address for the given prefix', async () => {
    const account = new AirgapAccount({
      index: 0,
      type: 'AIRGAP',
      name: 'Airgap 1',
      keyringId: 'keyring-ag',
      publicKey: [],
      addressBytes: makeAddressBytes(),
    });
    const address = await account.getAddress('g');
    expect(address).toMatch(/^g1/);
  });
});

describe('MultisigAccount.getAddress', () => {
  it('returns a bech32 address for the given prefix', async () => {
    const account = new MultisigAccount(BASE_MULTISIG_INFO);
    const address = await account.getAddress('g');
    expect(address).toMatch(/^g1/);
  });
});

describe('makeAccount', () => {
  it('returns an Account instance that derives an address for the given prefix', async () => {
    const account = makeAccount(BASE_SEED_INFO);
    const address = await account.getAddress('g');
    expect(address).toMatch(/^g1/);
  });
});
