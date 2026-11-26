import { fromBase64, toBase64 } from '@cosmjs/encoding';
import { MsgCreateSession, MsgRevokeAllSessions, MsgRevokeSession, SessionAccountInfo } from '@gnolang/gno-js-client';
import { PubKeySecp256k1, TM2Error, Tx } from '@gnolang/tm2-js-client';

import { AppErrorCode, isAppError } from '../../../src/core/errors';
import { CardDuration, CardPermissionKind, CardPolicy, SpendPeriod } from '../../../src/domain/session-card';
import { StorageKey } from '../../../src/migration/storage-keys';
import { BIOMETRICS_REQUIRED_FOR_CARDS_MESSAGE } from '../../../src/repositories/session-key.repository';
import { SecureKey, sessionCardSecureKey } from '../../../src/security/secure-keys';
import { SecureAccessPolicy } from '../../../src/security/secure-store';
import { CARD_CONFIRMATION_GRACE_MS } from '../../../src/services/session-card.service';
import { readJson } from '../../../src/storage/key-value-store';
import { setupWallet } from '../../helpers/render-screen';
import { createTestContainer } from '../../helpers/test-container';

const ROUTER = 'gno.land/r/gnoswap/router';
const FEE = { gasWanted: '200000', gasFee: '200ugnot' };

const policy: CardPolicy = {
  name: ' Trading bot ',
  permissions: [{ kind: CardPermissionKind.REALM, path: ROUTER }],
  spendLimit: '2000000',
  spendPeriod: SpendPeriod.DAILY,
  duration: CardDuration.SEVEN_DAYS,
};

const expectCode = async (promise: Promise<unknown>, code: AppErrorCode, message?: string): Promise<void> => {
  const error = await promise.then(() => null, (caught: unknown) => caught);

  expect(isAppError(error, code)).toBe(true);

  if (message) {
    expect((error as Error).message).toBe(message);
  }
};

const decodeBroadcast = (encoded: string): Tx => Tx.decode(fromBase64(encoded));

describe('SessionCardService', () => {
  let now = Date.parse('2026-11-26T10:00:00Z');

  const setup = async () => {
    const env = createTestContainer({ now: () => now });
    const wallet = await setupWallet(env);

    env.gno.state.balances[wallet.address] = '100000000ugnot';

    const sessionInfo = (address: string, overrides: Partial<SessionAccountInfo> = {}): SessionAccountInfo => ({
      address,
      master_address: wallet.address,
      public_key: null,
      expires_at: Math.floor(now / 1000) + CardDuration.SEVEN_DAYS,
      spend_limit: '2000000ugnot',
      spend_period: SpendPeriod.DAILY,
      spend_used: '300000ugnot',
      spend_reset: Math.floor(now / 1000) - 60,
      allow_paths: [`vm/exec:${ROUTER}`],
      ...overrides,
    });

    // The node now knows the session the last broadcast created.
    const commitLastCreate = (): string => {
      const tx = decodeBroadcast(env.gno.state.broadcasts.at(-1)!);
      const message = MsgCreateSession.decode(tx.messages[0].value);
      const publicKey = PubKeySecp256k1.decode(message.session_key!.value).key;
      const address = env.container.chainRegistry.forNetwork(wallet.network).deriveAddress(publicKey, wallet.network);

      env.gno.state.sessions[wallet.address] = [...(env.gno.state.sessions[wallet.address] ?? []), sessionInfo(address)];
      return address;
    };

    return { ...wallet, env, service: env.container.sessionCardService, sessionInfo, commitLastCreate };
  };

  beforeEach(() => {
    now = Date.parse('2026-11-26T10:00:00Z');
  });

  it('is offered on Gno networks only', async () => {
    const { service, network, env } = await setup();
    const atomone = env.container.networkService.getNetworks().find(item => item.family !== network.family);

    expect(service.isSupported(network)).toBe(true);

    if (atomone) {
      expect(service.isSupported(atomone)).toBe(false);
    }
  });

  it('issues a card signed by the master, storing its key biometric-only before broadcasting', async () => {
    const { service, account, network, address, env, commitLastCreate } = await setup();
    const setItem = jest.spyOn(env.secureStore, 'setItem');
    const prepared = await service.prepareIssue(account, network, policy);

    expect(env.gno.state.broadcasts).toHaveLength(0);
    // The review is estimated with a throwaway key; nothing is stored yet.
    expect(env.keyValueStore.getString(StorageKey.SESSION_CARDS)).toBeUndefined();

    const result = await service.submit(prepared, FEE);
    const tx = decodeBroadcast(env.gno.state.broadcasts[0]);
    const message = MsgCreateSession.decode(tx.messages[0].value);
    const sessionAddress = commitLastCreate();

    expect(result.committed).toBe(true);
    expect(tx.messages.map(item => item.type_url)).toEqual(['/auth.m_create_session']);
    expect(message).toMatchObject({
      creator: address,
      allow_paths: [`vm/exec:${ROUTER}`],
      spend_limit: '2000000ugnot',
      spend_period: BigInt(SpendPeriod.DAILY),
      expires_at: BigInt(Math.floor(now / 1000) + CardDuration.SEVEN_DAYS),
    });
    // The master signs: the signature carries the account key, not the session key.
    expect(toBase64(PubKeySecp256k1.decode(tx.signatures[0].pub_key!.value).key)).toBe(account.publicKey);

    const key = await env.secureStore.getItem(sessionCardSecureKey(sessionAddress));

    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(setItem).toHaveBeenCalledWith(sessionCardSecureKey(sessionAddress), key, expect.objectContaining({ policy: SecureAccessPolicy.BIOMETRIC }));

    const cards = await service.listCards(account, network);

    expect(cards).toHaveLength(1);
    expect(cards[0].record).toMatchObject({ name: 'Trading bot', sessionAddress, publicKey: toBase64(PubKeySecp256k1.decode(message.session_key!.value).key) });
    expect(cards[0].spendUsed).toBe('300000');
  });

  it('requires biometrics on the device', async () => {
    const { service, account, network, env } = await setup();

    env.secureStore.biometryKind = null;
    await expectCode(service.prepareIssue(account, network, policy), AppErrorCode.BIOMETRICS_UNAVAILABLE, BIOMETRICS_REQUIRED_FOR_CARDS_MESSAGE);
  });

  it('refuses an invalid policy and a full account', async () => {
    const { service, account, network, address, env, sessionInfo } = await setup();

    await expectCode(service.prepareIssue(account, network, { ...policy, spendLimit: '0' }), AppErrorCode.INVALID_REQUEST);

    env.gno.state.sessions[address] = Array.from({ length: 16 }, (_, index) => sessionInfo(`g1session${index}`));
    await expectCode(service.prepareIssue(account, network, policy), AppErrorCode.INVALID_REQUEST);
  });

  it('removes the key and record when the node rejects the card', async () => {
    const { service, account, network, env } = await setup();
    const setItem = jest.spyOn(env.secureStore, 'setItem');
    const prepared = await service.prepareIssue(account, network, policy);

    env.gno.state.rejectBroadcast = new TM2Error('invalid allow paths');
    await expectCode(service.submit(prepared, FEE), AppErrorCode.TRANSACTION_FAILED);

    const stored = setItem.mock.calls.map(([key]) => key).filter((key: SecureKey) => key.startsWith('session-card-key.'));

    expect(stored).toHaveLength(1);
    expect(await env.secureStore.hasItem(stored[0])).toBe(false);
    expect(readJson(env.keyValueStore, StorageKey.SESSION_CARDS)).toEqual({});
  });

  it('keeps the key while the outcome is unknown and drops it once the chain confirms it never landed', async () => {
    const { service, account, network, env } = await setup();
    const prepared = await service.prepareIssue(account, network, policy);

    env.gno.state.rejectBroadcast = new Error('socket hang up');
    await expect(service.submit(prepared, FEE)).rejects.toThrow();

    const [record] = Object.values(readJson<Record<string, { sessionAddress: string }>>(env.keyValueStore, StorageKey.SESSION_CARDS) ?? {});

    expect(record).toBeDefined();
    expect(await env.secureStore.hasItem(sessionCardSecureKey(record.sessionAddress))).toBe(true);

    // Still inside the grace period: the tx may yet commit.
    await service.listCards(account, network);
    expect(await env.secureStore.hasItem(sessionCardSecureKey(record.sessionAddress))).toBe(true);

    now += CARD_CONFIRMATION_GRACE_MS + 1;
    await service.listCards(account, network);
    expect(await env.secureStore.hasItem(sessionCardSecureKey(record.sessionAddress))).toBe(false);
    expect(readJson(env.keyValueStore, StorageKey.SESSION_CARDS)).toEqual({});
  });

  it('revokes a card with its stored public key and forgets its key', async () => {
    const { service, account, network, env, commitLastCreate, address } = await setup();

    await service.submit(await service.prepareIssue(account, network, policy), FEE);
    const sessionAddress = commitLastCreate();
    const [card] = await service.listCards(account, network);

    await service.submit(await service.prepareRevoke(account, network, card), FEE);

    const tx = decodeBroadcast(env.gno.state.broadcasts.at(-1)!);
    const revoked = MsgRevokeSession.decode(tx.messages[0].value);

    expect(revoked.creator).toBe(address);
    expect(toBase64(PubKeySecp256k1.decode(revoked.session_key!.value).key)).toBe(card.record?.publicKey);
    expect(await env.secureStore.hasItem(sessionCardSecureKey(sessionAddress))).toBe(false);
  });

  it('cannot revoke a card issued elsewhere before it signed anything, but revoke all can', async () => {
    const { service, account, network, address, env, sessionInfo } = await setup();

    env.gno.state.sessions[address] = [sessionInfo('g1elsewhere')];
    const [card] = await service.listCards(account, network);

    expect(card.record).toBeUndefined();
    await expectCode(service.prepareRevoke(account, network, card), AppErrorCode.INVALID_REQUEST);

    await service.submit(await service.prepareRevokeAll(account, network), FEE);
    const tx = decodeBroadcast(env.gno.state.broadcasts.at(-1)!);

    expect(MsgRevokeAllSessions.decode(tx.messages[0].value).creator).toBe(address);
  });

  it('inspects realm entries for what they open and token access', async () => {
    const { service, network, env } = await setup();

    env.gno.state.realmPaths = ['gno.land/r/gnoswap/router', 'gno.land/r/gnoswap/gns', 'gno.land/r/gnoswapx/other'];
    env.gno.state.signatures['gno.land/r/gnoswap/gns'] = [{ FuncName: 'Transfer', Results: [] }];

    await expect(service.inspectRealm('gno.land/r/gnoswap', network)).resolves.toEqual({
      path: 'gno.land/r/gnoswap',
      realms: ['gno.land/r/gnoswap/router', 'gno.land/r/gnoswap/gns'],
      tokenRealms: ['gno.land/r/gnoswap/gns'],
    });
    await expectCode(service.inspectRealm('gno.land/r/nothing', network), AppErrorCode.INVALID_REQUEST);
  });

  it('wipes card keys on account removal and factory reset', async () => {
    const { service, account, network, env, commitLastCreate } = await setup();

    await service.submit(await service.prepareIssue(account, network, policy), FEE);
    const first = commitLastCreate();

    service.accountScopedData.removeAccount(account.id);
    await new Promise(resolve => setImmediate(resolve));
    expect(await env.secureStore.hasItem(sessionCardSecureKey(first))).toBe(false);

    await service.submit(await service.prepareIssue(account, network, policy), FEE);
    const second = commitLastCreate();

    await env.container.appResetService.resetAll();
    expect(await env.secureStore.hasItem(sessionCardSecureKey(second))).toBe(false);
  });
});
