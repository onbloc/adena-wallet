import { toHex } from '@cosmjs/encoding';

import { isAppError } from '../src/core/errors';
import { HDKeyring } from '../src/crypto/keyring';
import { mnemonicToSeed } from '../src/crypto/mnemonic';
import { shouldAutoLock } from '../src/hooks/auto-lock-policy';
import { MemorySecureStore } from '../src/security/memory-secure-store';
import { SecureKey } from '../src/security/secure-keys';
import { ScryptXChaChaVaultCipher } from '../src/security/vault-cipher';
import { delayAfter, FREE_PASSWORD_ATTEMPTS } from '../src/services/password-attempt-limiter';
import { CANARY_KEY, openGuardedStore, resetUnreadableStorage } from '../src/storage/guarded-store';
import { MemoryKeyValueStore } from '../src/storage/memory-key-value-store';
import { useDappRequestStore } from '../src/stores/dapp-request.store';
import { createTestContainer, TEST_MNEMONIC, TEST_PASSWORD } from './helpers/test-container';

const failUnlock = (unlock: () => Promise<void>) => unlock().catch(error => error);

describe('password attempt limit', () => {
  it('backs off after the free attempts and caps the delay', () => {
    expect(delayAfter(FREE_PASSWORD_ATTEMPTS)).toBe(0);
    expect(delayAfter(FREE_PASSWORD_ATTEMPTS + 1)).toBe(30_000);
    expect(delayAfter(FREE_PASSWORD_ATTEMPTS + 2)).toBe(60_000);
    expect(delayAfter(100)).toBe(60 * 60 * 1000);
  });

  it('blocks every password check while waiting, even the correct password', async () => {
    let now = 1_000_000;
    const { container } = createTestContainer({ now: () => now });

    await container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });
    container.walletService.lock();

    for (let i = 0; i <= FREE_PASSWORD_ATTEMPTS; i++) {
      expect(isAppError(await failUnlock(() => container.walletService.unlock('wrong password')), 'INVALID_PASSWORD')).toBe(true);
    }

    const blocked = await failUnlock(() => container.walletService.unlock(TEST_PASSWORD));

    expect(isAppError(blocked, 'PASSWORD_ATTEMPTS_EXCEEDED')).toBe(true);
    // Other prompts share the same limit.
    const reveal = await failUnlock(() => container.walletService.enableBiometricUnlock(TEST_PASSWORD));

    expect(isAppError(reveal, 'PASSWORD_ATTEMPTS_EXCEEDED') || isAppError(reveal, 'BIOMETRICS_UNAVAILABLE')).toBe(true);

    now += delayAfter(FREE_PASSWORD_ATTEMPTS + 1);
    await container.walletService.unlock(TEST_PASSWORD);
    expect(await container.walletService.getStatus()).toBe('unlocked');
  });

  it('never waits longer than the policy delay after the clock moves back', async () => {
    let now = 10_000_000_000;
    const { container, secureStore } = createTestContainer({ now: () => now });

    await container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });
    container.walletService.lock();

    for (let i = 0; i <= FREE_PASSWORD_ATTEMPTS; i++) {
      await failUnlock(() => container.walletService.unlock('wrong password'));
    }

    expect(await secureStore.getItem(SecureKey.PASSWORD_ATTEMPTS)).toBeDefined();

    now -= 365 * 24 * 60 * 60 * 1000;
    expect(isAppError(await failUnlock(() => container.walletService.unlock(TEST_PASSWORD)), 'PASSWORD_ATTEMPTS_EXCEEDED')).toBe(true);
    now += delayAfter(FREE_PASSWORD_ATTEMPTS + 1);
    await container.walletService.unlock(TEST_PASSWORD);
  });

  it('resets the counter after a successful check', async () => {
    const { container, secureStore } = createTestContainer();

    await container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });
    container.walletService.lock();
    await failUnlock(() => container.walletService.unlock('wrong password'));
    expect(await secureStore.getItem(SecureKey.PASSWORD_ATTEMPTS)).toBeTruthy();
    await container.walletService.unlock(TEST_PASSWORD);
    expect(await secureStore.getItem(SecureKey.PASSWORD_ATTEMPTS)).toBeFalsy();
  });
});

describe('guarded general storage', () => {
  const setup = () => {
    const secureStore = new MemorySecureStore();
    const meta = new MemoryKeyValueStore();
    const files = new Map<string, MemoryKeyValueStore>();
    let keyCounter = 0;
    const open = (key: string): MemoryKeyValueStore => {
      if (!files.has(key)) {
        files.set(key, new MemoryKeyValueStore());
      }

      return files.get(key)!;
    };
    const deps = { secureStore, meta, open, generateKey: () => `key-${++keyCounter}` };

    return { secureStore, meta, files, deps };
  };

  it('starts fresh once, then reopens the same data', async () => {
    const { deps } = setup();
    const first = await openGuardedStore(deps);

    first.setString('accounts', '[1]');
    expect(first.getAllKeys()).toEqual(['accounts']);
    expect(first.getString(CANARY_KEY)).toBeUndefined();

    const second = await openGuardedStore(deps);

    expect(second.getString('accounts')).toBe('[1]');
  });

  it('refuses to start over when the key is missing or the data is unreadable', async () => {
    const { deps, secureStore, files } = setup();

    await openGuardedStore(deps);

    files.clear();
    expect(isAppError(await openGuardedStore(deps).catch(error => error), 'STORAGE_UNREADABLE')).toBe(true);

    await secureStore.removeItem(SecureKey.STORAGE_ENCRYPTION_KEY);
    expect(isAppError(await openGuardedStore(deps).catch(error => error), 'STORAGE_UNREADABLE')).toBe(true);
  });

  it('keeps the canary through clearAll and recovers by dropping general data only', async () => {
    const { deps, secureStore, files } = setup();
    const store = await openGuardedStore(deps);

    await secureStore.setItem(SecureKey.VAULT, 'vault');
    store.clearAll();
    await expect(openGuardedStore(deps)).resolves.toBeDefined();

    files.clear();
    await resetUnreadableStorage({ secureStore, meta: deps.meta, deleteData: () => files.clear() });
    await expect(openGuardedStore(deps)).resolves.toBeDefined();
    expect(await secureStore.getItem(SecureKey.VAULT)).toBe('vault');
  });
});

describe('auto-lock policy', () => {
  it('locks after the window and when the clock moves backwards', () => {
    expect(shouldAutoLock(1000, 1000 + 59_000, 60_000)).toBe(false);
    expect(shouldAutoLock(1000, 1000 + 60_000, 60_000)).toBe(true);
    expect(shouldAutoLock(1000, 500, 60_000)).toBe(true);
  });
});

describe('dApp request queue', () => {
  const request = { requestId: 'r1' } as never;

  beforeEach(() => useDappRequestStore.setState({ queue: [], active: null, inFlight: false }));

  it('queues requests and keeps an in-flight request in place when locking', () => {
    const store = useDappRequestStore.getState();

    store.enqueue('adena://request?payload=a');
    store.enqueue('adena://request?payload=b');
    store.enqueue('adena://request?payload=a');
    expect(useDappRequestStore.getState().queue).toHaveLength(2);

    const url = store.dequeue()!;

    store.setActive({ url, request });
    store.setInFlight(true);
    store.requeueActive();
    expect(useDappRequestStore.getState().active?.url).toBe(url);

    store.setInFlight(false);
    store.requeueActive();
    expect(useDappRequestStore.getState().active).toBeNull();
    expect(useDappRequestStore.getState().queue[0]).toBe(url);
  });

  it('drops requests beyond the queue limit', () => {
    const store = useDappRequestStore.getState();
    const accepted = Array.from({ length: 7 }, (_, i) => store.enqueue(`adena://request?payload=${i}`));

    expect(accepted.filter(Boolean)).toHaveLength(5);
  });
});

describe('vault seed cache', () => {
  it('stores the BIP39 seed in the vault and derives identical keys from it', async () => {
    const { container, secureStore } = createTestContainer();

    await container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });

    const stored = JSON.parse((await secureStore.getItem(SecureKey.VAULT))!);
    const content = JSON.parse(await new ScryptXChaChaVaultCipher().decrypt(stored.record.payload, TEST_PASSWORD));
    const seedHex = toHex(await mnemonicToSeed(TEST_MNEMONIC));

    expect(content.keyrings[0].seed).toBe(seedHex);

    const cached = await new HDKeyring('k', TEST_MNEMONIC, seedHex).deriveKeyPair(3);
    const derived = await new HDKeyring('k', TEST_MNEMONIC).deriveKeyPair(3);

    expect(toHex(cached.privateKey)).toBe(toHex(derived.privateKey));
  });
});

describe('amount parsing with invalid input', () => {
  it('treats empty or malformed amounts as not positive instead of throwing', () => {
    const { isPositiveAmount } = jest.requireActual('../src/utils/amount');

    expect(isPositiveAmount('')).toBe(false);
    expect(isPositiveAmount('.')).toBe(false);
    expect(isPositiveAmount('1.2.3')).toBe(false);
    expect(isPositiveAmount('0.5')).toBe(true);
  });
});

describe('activity amounts for GRC20 tokens', () => {
  it('applies decimals when history only carries the realm path', () => {
    const { formatActivityAmount } = jest.requireActual('../src/presenters/activity.presenter');
    const gns = { id: 'gno.land/r/gnoswap/gns.GNS', type: 'grc20', pkgPath: 'gno.land/r/gnoswap/gns', symbol: 'GNS', decimals: 6, denom: 'GNS' };

    expect(formatActivityAmount({ value: '10000000000', denom: 'gno.land/r/gnoswap/gns' }, [gns])).toBe('10,000 GNS');
    expect(formatActivityAmount({ value: '5', denom: 'gno.land/r/demo/unknown' }, [gns])).toBe('5 unknown');
  });
});
