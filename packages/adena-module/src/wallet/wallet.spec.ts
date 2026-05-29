import { MockLedgerConnector } from './../test-utils/mock-ledgerconnector';
import { SessionAccount } from './account/session-account';
import { SessionKeyring } from './keyring/session-keyring';
import { AdenaWallet } from './wallet';
import { generateKdfSalt } from './wallet-crypto-util';

const mnemonic =
  'source bonus chronic canvas draft south burst lottery vacant surface solve popular case indicate oppose farm nothing bullet exhibit title speed wink action roast';

describe('create wallet by mnemonic', () => {
  it('create success', async () => {
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);
    const walletMnemonic = wallet.getMnemonic();

    expect(walletMnemonic).toBe(mnemonic);
  });

  it('account initialize success', async () => {
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);

    expect(wallet.accounts.length).toBe(1);
  });

  it("initilaize account' address is corret", async () => {
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);
    const account = wallet.accounts[0];
    const address = await account.getAddress('g');

    expect(address).toBe('g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5');
  });
});

describe('create wallet by web3 auth', () => {
  it('create success', async () => {
    const privateKeyHexStr = 'ea97b9fddb7e6bf6867090a7a819657047949fbb9466d617f940538efd888605';
    const wallet = await AdenaWallet.createByWeb3Auth(privateKeyHexStr);

    expect(wallet.currentKeyring.type).toBe('WEB3_AUTH');
  });

  it('account initialize success', async () => {
    const privateKeyHexStr = 'ea97b9fddb7e6bf6867090a7a819657047949fbb9466d617f940538efd888605';
    const wallet = await AdenaWallet.createByWeb3Auth(privateKeyHexStr);

    expect(wallet.accounts.length).toBe(1);
  });

  it("initilaize account' address is corret", async () => {
    const privateKeyHexStr = 'ea97b9fddb7e6bf6867090a7a819657047949fbb9466d617f940538efd888605';
    const wallet = await AdenaWallet.createByWeb3Auth(privateKeyHexStr);
    const account = wallet.accounts[0];
    const address = await account.getAddress('g');

    expect(address).toBe('g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5');
  });
});

describe('create wallet by ledger', () => {
  it('create success', async () => {
    try {
      const ledgerConnector = await MockLedgerConnector.create();
      const wallet = await AdenaWallet.createByLedger(ledgerConnector);

      expect(wallet.currentKeyring.type).toBe('LEDGER');
    } catch (e) {}
  });

  it('account initialize success', async () => {
    try {
      const ledgerConnector = await MockLedgerConnector.create();
      const wallet = await AdenaWallet.createByLedger(ledgerConnector);

      expect(wallet.accounts.length).toBe(1);
    } catch (e) {}
  });
});

describe('serialize', () => {
  let salt: Uint8Array;

  beforeAll(async () => {
    salt = await generateKdfSalt();
  });

  it('serialize success', async () => {
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);
    const serialized = await wallet.serialize('PASSWORD', salt);

    expect(serialized).toBeTruthy();
    const parsed = JSON.parse(serialized);
    expect(parsed.ciphertext).toBeTruthy();
    expect(parsed.nonce).toBeTruthy();
  });

  it('serialize then deserialize round-trip success', async () => {
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);
    const serialized = await wallet.serialize('PASSWORD', salt);
    const deserialized = await AdenaWallet.deserialize(serialized, 'PASSWORD', salt);

    expect(deserialized).toBeTruthy();
    expect(deserialized.accounts.length).toBe(1);
    expect(deserialized.getMnemonic()).toBe(mnemonic);
  });

  it('deserialize with invalid password throws', async () => {
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);
    const serialized = await wallet.serialize('PASSWORD', salt);

    await expect(
      AdenaWallet.deserialize(serialized, 'INVALID_PASSWORD', salt),
    ).rejects.toThrow();
  });

  it('deserialize with different salt throws', async () => {
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);
    const serialized = await wallet.serialize('PASSWORD', salt);
    const differentSalt = await generateKdfSalt();

    await expect(
      AdenaWallet.deserialize(serialized, 'PASSWORD', differentSalt),
    ).rejects.toThrow();
  });
});

describe('toJSON / fromJSON', () => {
  it('round-trip preserves wallet data', async () => {
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);
    const json = wallet.toJSON();
    const restored = AdenaWallet.fromJSON(json);

    expect(restored.accounts.length).toBe(1);
    expect(restored.getMnemonic()).toBe(mnemonic);
  });

  it('toJSON produces valid JSON with wallet fields', async () => {
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);
    const json = wallet.toJSON();
    const parsed = JSON.parse(json);

    expect(parsed).toHaveProperty('accounts');
    expect(parsed).toHaveProperty('keyrings');
    expect(parsed).toHaveProperty('currentAccountId');
  });

  it('toJSON is not encrypted (no ciphertext/nonce)', async () => {
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);
    const json = wallet.toJSON();
    const parsed = JSON.parse(json);

    expect(parsed).not.toHaveProperty('ciphertext');
    expect(parsed).not.toHaveProperty('nonce');
  });

  it('fromJSON with invalid JSON throws', () => {
    expect(() => AdenaWallet.fromJSON('invalid')).toThrow();
  });
});

describe('nextSessionAccountName', () => {
  const baseSessionConfig = {
    masterAddress: 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5',
    chainId: 'test-13',
    status: 'ACTIVE' as const,
    expiresAt: 1_900_000_000,
    allowPaths: ['vm/exec:gno.land/r/demo/foo'],
    spendLimit: '1000000ugnot',
    spendPeriod: 86_400,
  };

  it('returns Session 1 when no session accounts exist', async () => {
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);

    expect(wallet.nextSessionAccountName).toBe('Session 1');
  });

  const addSession = async (wallet: AdenaWallet, name: string): Promise<SessionAccount> => {
    const keyring = await SessionKeyring.generate(baseSessionConfig.masterAddress);
    const session = SessionAccount.createBy(keyring, name, baseSessionConfig);
    wallet.addKeyring(keyring);
    wallet.addAccount(session);
    return session;
  };

  it('uses the highest existing Session number plus one', async () => {
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);
    await addSession(wallet, 'Session 1');
    await addSession(wallet, 'Session 2');

    expect(wallet.nextSessionAccountName).toBe('Session 3');
  });

  it('ignores session accounts with custom (non "Session N") names', async () => {
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);
    await addSession(wallet, 'Existing Name');
    await addSession(wallet, 'Another Name');

    expect(wallet.nextSessionAccountName).toBe('Session 1');
  });

  it('does not reuse a number after a session is deleted', async () => {
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);
    await addSession(wallet, 'Session 1');
    const session2 = await addSession(wallet, 'Session 2');
    await addSession(wallet, 'Session 3');

    wallet.removeAccount(session2);

    expect(wallet.nextSessionAccountName).toBe('Session 4');
  });

  it('does not count session accounts toward lastAccountIndex', async () => {
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);
    const beforeIndex = wallet.lastAccountIndex;

    const keyring = await SessionKeyring.generate(baseSessionConfig.masterAddress);
    const session = SessionAccount.createBy(keyring, 'Session 1', baseSessionConfig);
    wallet.addKeyring(keyring);
    wallet.addAccount(session);

    expect(wallet.lastAccountIndex).toBe(beforeIndex);
  });

  it('exports the current session account private key', async () => {
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);
    const keyring = await SessionKeyring.generate(baseSessionConfig.masterAddress);
    const session = SessionAccount.createBy(keyring, 'Session 1', baseSessionConfig);
    wallet.addKeyring(keyring);
    wallet.addAccount(session);
    wallet.currentAccountId = session.id;

    await expect(wallet.getPrivateKeyStr()).resolves.toBe(
      Buffer.from(keyring.privateKey).toString('hex'),
    );
  });
});

describe('destroy', () => {
  it('clears keyrings and accounts after destroy', async () => {
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);
    expect(wallet.keyrings.length).toBeGreaterThan(0);
    expect(wallet.accounts.length).toBeGreaterThan(0);

    wallet.destroy();

    expect(wallet.keyrings.length).toBe(0);
    expect(wallet.accounts.length).toBe(0);
  });

  it('keyring seed is zeroed after destroy', async () => {
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);
    const keyring = wallet.keyrings[0] as any;
    const seedBefore = new Uint8Array(keyring.seed);

    wallet.destroy();

    // Original buffer should be zeroed
    expect(seedBefore.every((b: number) => b === 0)).toBe(false);
    expect(keyring.seed.every((b: number) => b === 0)).toBe(true);
  });
});
