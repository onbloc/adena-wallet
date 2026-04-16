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

describe('SeedAccount.resolveAddress', () => {
  it('returns the same address as getAddress', async () => {
    const account = new SeedAccount(BASE_SEED_INFO);
    const expected = await account.getAddress('g');
    const resolved = await account.resolveAddress('g');
    expect(resolved).toBe(expected);
    expect(resolved).toMatch(/^g1/);
  });

  it('returns atone-prefixed address for atone prefix', async () => {
    const account = new SeedAccount(BASE_SEED_INFO);
    const address = await account.resolveAddress('atone');
    expect(address).toMatch(/^atone1/);
  });

  it('caches the result — getAddress is not called again on second call', async () => {
    const account = new SeedAccount(BASE_SEED_INFO);
    const spy = jest.spyOn(account, 'getAddress');
    await account.resolveAddress('g');
    await account.resolveAddress('g');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('caches different prefixes independently', async () => {
    const account = new SeedAccount(BASE_SEED_INFO);
    const gAddress = await account.resolveAddress('g');
    const atoneAddress = await account.resolveAddress('atone');
    expect(gAddress).toMatch(/^g1/);
    expect(atoneAddress).toMatch(/^atone1/);
    expect(gAddress).not.toBe(atoneAddress);
  });

  it('two instances do not share cache (WeakMap isolation)', async () => {
    const a = new SeedAccount(BASE_SEED_INFO);
    const b = new SeedAccount(BASE_SEED_INFO);
    const spyA = jest.spyOn(a, 'getAddress');
    const spyB = jest.spyOn(b, 'getAddress');
    await a.resolveAddress('g');
    await b.resolveAddress('g');
    expect(spyA).toHaveBeenCalledTimes(1);
    expect(spyB).toHaveBeenCalledTimes(1);
  });

  it('fromData produces a new instance with empty cache (cache miss after round-trip)', async () => {
    const account = new SeedAccount(BASE_SEED_INFO);
    await account.resolveAddress('g');
    const restored = SeedAccount.fromData(account.toData());
    const spy = jest.spyOn(restored, 'getAddress');
    await restored.resolveAddress('g');
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('LedgerAccount.resolveAddress', () => {
  it('returns the same address as getAddress', async () => {
    const account = new LedgerAccount(BASE_LEDGER_INFO);
    const expected = await account.getAddress('g');
    const resolved = await account.resolveAddress('g');
    expect(resolved).toBe(expected);
  });

  it('caches the result on second call', async () => {
    const account = new LedgerAccount(BASE_LEDGER_INFO);
    const spy = jest.spyOn(account, 'getAddress');
    await account.resolveAddress('g');
    await account.resolveAddress('g');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('fromData produces a new instance with empty cache', async () => {
    const account = new LedgerAccount(BASE_LEDGER_INFO);
    await account.resolveAddress('g');
    const restored = LedgerAccount.fromData(account.toData());
    const spy = jest.spyOn(restored, 'getAddress');
    await restored.resolveAddress('g');
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('SingleAccount.resolveAddress', () => {
  it('returns the same address as getAddress', async () => {
    const account = new SingleAccount(BASE_SINGLE_INFO);
    const expected = await account.getAddress('g');
    const resolved = await account.resolveAddress('g');
    expect(resolved).toBe(expected);
  });

  it('caches the result on second call', async () => {
    const account = new SingleAccount(BASE_SINGLE_INFO);
    const spy = jest.spyOn(account, 'getAddress');
    await account.resolveAddress('g');
    await account.resolveAddress('g');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('fromData produces a new instance with empty cache', async () => {
    const account = new SingleAccount(BASE_SINGLE_INFO);
    await account.resolveAddress('g');
    const restored = SingleAccount.fromData(account.toData());
    const spy = jest.spyOn(restored, 'getAddress');
    await restored.resolveAddress('g');
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('AirgapAccount.resolveAddress', () => {
  it('returns the same address as getAddress', async () => {
    const addrBytes = makeAddressBytes();
    const account = new AirgapAccount({
      index: 0,
      type: 'AIRGAP',
      name: 'Airgap 1',
      keyringId: 'keyring-ag',
      publicKey: [],
      addressBytes: addrBytes,
    });
    const expected = await account.getAddress('g');
    const resolved = await account.resolveAddress('g');
    expect(resolved).toBe(expected);
    expect(resolved).toMatch(/^g1/);
  });

  it('caches the result on second call', async () => {
    const addrBytes = makeAddressBytes();
    const account = new AirgapAccount({
      index: 0,
      type: 'AIRGAP',
      name: 'Airgap 1',
      keyringId: 'keyring-ag',
      publicKey: [],
      addressBytes: addrBytes,
    });
    const spy = jest.spyOn(account, 'getAddress');
    await account.resolveAddress('g');
    await account.resolveAddress('g');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('fromData produces a new instance with empty cache', async () => {
    const addrBytes = makeAddressBytes();
    const account = new AirgapAccount({
      index: 0,
      type: 'AIRGAP',
      name: 'Airgap 1',
      keyringId: 'keyring-ag',
      publicKey: [],
      addressBytes: addrBytes,
    });
    await account.resolveAddress('g');
    const restored = AirgapAccount.fromData(account.toData());
    const spy = jest.spyOn(restored, 'getAddress');
    await restored.resolveAddress('g');
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('MultisigAccount.resolveAddress', () => {
  it('returns the same address as getAddress', async () => {
    const account = new MultisigAccount(BASE_MULTISIG_INFO);
    const expected = await account.getAddress('g');
    const resolved = await account.resolveAddress('g');
    expect(resolved).toBe(expected);
    expect(resolved).toMatch(/^g1/);
  });

  it('caches the result on second call', async () => {
    const account = new MultisigAccount(BASE_MULTISIG_INFO);
    const spy = jest.spyOn(account, 'getAddress');
    await account.resolveAddress('g');
    await account.resolveAddress('g');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('fromData produces a new instance with empty cache', async () => {
    const account = new MultisigAccount(BASE_MULTISIG_INFO);
    await account.resolveAddress('g');
    const restored = MultisigAccount.fromData(account.toData());
    const spy = jest.spyOn(restored, 'getAddress');
    await restored.resolveAddress('g');
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('makeAccount + resolveAddress', () => {
  it('makeAccount returns an Account with resolveAddress for HD_WALLET', async () => {
    const account = makeAccount(BASE_SEED_INFO);
    const address = await account.resolveAddress('g');
    expect(address).toMatch(/^g1/);
  });
});
