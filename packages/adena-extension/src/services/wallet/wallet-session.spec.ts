import {
  AdenaWallet,
  ChainRegistry,
  publicKeyToAddress,
} from 'adena-module';
import { Wallet as Tm2Wallet } from '@gnolang/tm2-js-client';

import { GnoProvider } from '@common/provider/gno/gno-provider';
import { GnoSessionAccountResponse } from '@common/provider/gno/types';
import { SessionMetadataV021 } from '@migrates/migrations/v021/storage-model-v021';
import { SessionRepository } from '@repositories/session';
import { NetworkMetainfo } from '@types';

import {
  SessionImportError,
  SessionImportPreview,
  WalletSessionService,
} from './wallet-session';
import { WalletService } from './wallet';

const MASTER_ADDRESS = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';
const PRIV_KEY_1 = '0000000000000000000000000000000000000000000000000000000000000001';
const PRIV_KEY_2 = '0000000000000000000000000000000000000000000000000000000000000002';

const network: NetworkMetainfo = {
  id: 'test-13',
  default: true,
  chainId: 'test-13',
  chainName: 'Gno Testnet',
  networkId: 'test-13',
  networkName: 'Test 13',
  addressPrefix: 'g',
  rpcUrl: 'https://rpc.test-13.gnoland.network',
  indexerUrl: '',
  gnoUrl: '',
  apiUrl: '',
  linkUrl: '',
};

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function makeChainRegistry(): ChainRegistry {
  return {
    getChainByChainId: jest.fn(() => ({
      chainGroup: 'gno',
    })),
  } as unknown as ChainRegistry;
}

function makeSessionRepository(): SessionRepository & {
  sessions: Record<string, SessionMetadataV021>;
} {
  const sessions: Record<string, SessionMetadataV021> = {};
  return {
    sessions,
    get: jest.fn(async (sessionAddr: string) => sessions[sessionAddr] ?? null),
    getAll: jest.fn(async () => ({ ...sessions })),
    set: jest.fn(async (sessionAddr: string, metadata: SessionMetadataV021) => {
      sessions[sessionAddr] = metadata;
    }),
    setMany: jest.fn(
      async (entries: Array<{ sessionAddr: string; metadata: SessionMetadataV021 }>) => {
        for (const entry of entries) {
          sessions[entry.sessionAddr] = entry.metadata;
        }
      },
    ),
    remove: jest.fn(async (sessionAddr: string) => {
      delete sessions[sessionAddr];
    }),
  } as unknown as SessionRepository & {
    sessions: Record<string, SessionMetadataV021>;
  };
}

function makeWalletService(wallet: AdenaWallet): WalletService & {
  savedWallet: AdenaWallet | null;
  updateWallet: jest.Mock;
} {
  const service = {
    savedWallet: null as AdenaWallet | null,
    existsWallet: jest.fn(async () => true),
    isLocked: jest.fn(async () => false),
    loadWallet: jest.fn(async () => wallet),
    updateWallet: jest.fn(async (nextWallet: AdenaWallet) => {
      service.savedWallet = nextWallet;
    }),
  };
  return service as unknown as WalletService & {
    savedWallet: AdenaWallet | null;
    updateWallet: jest.Mock;
  };
}

function makeMetadata(): SessionMetadataV021 {
  return {
    masterAddress: MASTER_ADDRESS,
    chainId: network.chainId,
    allowPaths: ['bank/send'],
    spendLimit: '100ugnot',
    spendPeriod: 0,
    expiresAt: 0,
    status: 'ACTIVE',
    createdAt: 1,
  };
}

async function makeSessionRecord(
  privateKeyHex: string,
  expiresAt = '0',
): Promise<{ sessionAddr: string; record: GnoSessionAccountResponse }> {
  const tmWallet = await Tm2Wallet.fromPrivateKey(hexToBytes(privateKeyHex));
  const publicKey = await tmWallet.getSigner().getPublicKey();
  const sessionAddr = await publicKeyToAddress(publicKey, 'g');

  return {
    sessionAddr,
    record: {
      BaseSessionAccount: {
        BaseAccount: {
          address: sessionAddr,
          coins: '',
          public_key: {
            '@type': '/tm.PubKeySecp256k1',
            value: Buffer.from(publicKey).toString('base64'),
          },
          account_number: '1',
          sequence: '0',
        },
        master_address: MASTER_ADDRESS,
        expires_at: expiresAt,
        spend_limit: '100ugnot',
        spend_period: '0',
        spend_used: '',
        spend_reset: '0',
      },
      allow_paths: ['bank/send'],
    },
  };
}

function makeService(
  provider: GnoProvider,
  repository: SessionRepository,
  walletService: WalletService,
): WalletSessionService {
  return new WalletSessionService(
    walletService,
    repository,
    provider,
    makeChainRegistry(),
  );
}

describe('WalletSessionService bulk import', () => {
  it('lists active sessions for a valid master address', async () => {
    const session = await makeSessionRecord(PRIV_KEY_1);
    const provider = {
      getSessions: jest.fn(async () => [session.record]),
    } as unknown as GnoProvider;
    const repository = makeSessionRepository();
    const service = makeService(provider, repository, makeWalletService(new AdenaWallet()));

    const result = await service.listImportableSessions(MASTER_ADDRESS, network);

    expect(result).toHaveLength(1);
    expect(result[0].sessionAddr).toBe(session.sessionAddr);
    expect(result[0].alreadyImported).toBe(false);
    expect(result[0].isExpired).toBe(false);
  });

  it('lists expired sessions with an expired flag', async () => {
    const active = await makeSessionRecord(PRIV_KEY_1);
    const expiredAt = String(Math.floor(Date.now() / 1000) - 60);
    const expired = await makeSessionRecord(PRIV_KEY_2, expiredAt);
    const provider = {
      getSessions: jest.fn(async () => [active.record, expired.record]),
    } as unknown as GnoProvider;
    const repository = makeSessionRepository();
    const service = makeService(provider, repository, makeWalletService(new AdenaWallet()));

    const result = await service.listImportableSessions(MASTER_ADDRESS, network);

    expect(result).toHaveLength(2);
    expect(result.find((item) => item.sessionAddr === active.sessionAddr)?.isExpired).toBe(false);
    expect(result.find((item) => item.sessionAddr === expired.sessionAddr)?.isExpired).toBe(true);
  });

  it('allows importing an expired session with expired metadata status', async () => {
    const expiredAt = String(Math.floor(Date.now() / 1000) - 60);
    const session = await makeSessionRecord(PRIV_KEY_1, expiredAt);
    const provider = {
      getSession: jest.fn(async () => session.record),
    } as unknown as GnoProvider;
    const repository = makeSessionRepository();
    const walletService = makeWalletService(new AdenaWallet());
    const service = makeService(provider, repository, walletService);

    const preview = await service.previewSessionImportForAddress(
      PRIV_KEY_1,
      MASTER_ADDRESS,
      session.sessionAddr,
      network,
    );
    const accounts = await service.commitSessionImports([preview], network, {
      [session.sessionAddr]: PRIV_KEY_1,
    });

    expect(preview.metadata.status).toBe('EXPIRED');
    expect(accounts).toHaveLength(1);
    expect(repository.sessions[session.sessionAddr]?.status).toBe('EXPIRED');
    expect(walletService.updateWallet).toHaveBeenCalledTimes(1);
  });

  it('does not mark stale session metadata as imported when the wallet lacks the account', async () => {
    const session = await makeSessionRecord(PRIV_KEY_1);
    const provider = {
      getSessions: jest.fn(async () => [session.record]),
    } as unknown as GnoProvider;
    const repository = makeSessionRepository();
    repository.sessions[session.sessionAddr] = makeMetadata();
    const service = makeService(provider, repository, makeWalletService(new AdenaWallet()));

    const result = await service.listImportableSessions(MASTER_ADDRESS, network);

    expect(result[0].alreadyImported).toBe(false);
  });

  it('clears stale session metadata and allows preview when the wallet lacks the account', async () => {
    const session = await makeSessionRecord(PRIV_KEY_1);
    const provider = {
      getSession: jest.fn(async () => session.record),
    } as unknown as GnoProvider;
    const repository = makeSessionRepository();
    repository.sessions[session.sessionAddr] = makeMetadata();
    const service = makeService(provider, repository, makeWalletService(new AdenaWallet()));

    const preview = await service.previewSessionImportForAddress(
      PRIV_KEY_1,
      MASTER_ADDRESS,
      session.sessionAddr,
      network,
    );

    expect(preview.sessionAddr).toBe(session.sessionAddr);
    expect(repository.sessions[session.sessionAddr]).toBeUndefined();
  });

  it('throws no_sessions_found when chain has no sessions for the master', async () => {
    const provider = {
      getSessions: jest.fn(async () => []),
    } as unknown as GnoProvider;
    const service = makeService(
      provider,
      makeSessionRepository(),
      makeWalletService(new AdenaWallet()),
    );

    await expect(service.listImportableSessions(MASTER_ADDRESS, network)).rejects.toMatchObject({
      reason: 'no_sessions_found',
    } satisfies Partial<SessionImportError>);
  });

  it('rejects a private key that does not match the selected session address', async () => {
    const session = await makeSessionRecord(PRIV_KEY_1);
    const provider = {
      getSession: jest.fn(async () => session.record),
    } as unknown as GnoProvider;
    const service = makeService(
      provider,
      makeSessionRepository(),
      makeWalletService(new AdenaWallet()),
    );

    await expect(
      service.previewSessionImportForAddress(
        PRIV_KEY_2,
        MASTER_ADDRESS,
        session.sessionAddr,
        network,
      ),
    ).rejects.toMatchObject({
      reason: 'session_pubkey_mismatch',
    } satisfies Partial<SessionImportError>);
  });

  it('commits multiple sessions in one wallet update', async () => {
    const first = await makeSessionRecord(PRIV_KEY_1);
    const second = await makeSessionRecord(PRIV_KEY_2);
    const records = {
      [first.sessionAddr]: first.record,
      [second.sessionAddr]: second.record,
    };
    const provider = {
      getSession: jest.fn(async (_master: string, sessionAddr: string) => records[sessionAddr]),
    } as unknown as GnoProvider;
    const repository = makeSessionRepository();
    const walletService = makeWalletService(new AdenaWallet());
    const service = makeService(provider, repository, walletService);

    const previews: SessionImportPreview[] = [
      await service.previewSessionImportForAddress(
        PRIV_KEY_1,
        MASTER_ADDRESS,
        first.sessionAddr,
        network,
      ),
      await service.previewSessionImportForAddress(
        PRIV_KEY_2,
        MASTER_ADDRESS,
        second.sessionAddr,
        network,
      ),
    ];

    const accounts = await service.commitSessionImports(previews, network, {
      [first.sessionAddr]: PRIV_KEY_1,
      [second.sessionAddr]: PRIV_KEY_2,
    });

    expect(accounts).toHaveLength(2);
    expect(repository.sessions[first.sessionAddr]).toBeDefined();
    expect(repository.sessions[second.sessionAddr]).toBeDefined();
    expect(walletService.updateWallet).toHaveBeenCalledTimes(1);
    expect(walletService.savedWallet?.accounts).toHaveLength(2);
    expect(accounts.map((account) => account.name)).toEqual(['Session 1', 'Session 2']);
    expect(walletService.savedWallet?.accounts.map((account) => account.name)).toEqual([
      'Session 1',
      'Session 2',
    ]);
  });

  it('bootstraps imported sessions with session names for a fresh wallet', async () => {
    const first = await makeSessionRecord(PRIV_KEY_1);
    const second = await makeSessionRecord(PRIV_KEY_2);
    const records = {
      [first.sessionAddr]: first.record,
      [second.sessionAddr]: second.record,
    };
    const provider = {
      getSession: jest.fn(async (_master: string, sessionAddr: string) => records[sessionAddr]),
    } as unknown as GnoProvider;
    const repository = makeSessionRepository();
    const walletService = makeWalletService(new AdenaWallet());
    const service = makeService(provider, repository, walletService);

    const previews: SessionImportPreview[] = [
      await service.previewSessionImportForAddress(
        PRIV_KEY_1,
        MASTER_ADDRESS,
        first.sessionAddr,
        network,
      ),
      await service.previewSessionImportForAddress(
        PRIV_KEY_2,
        MASTER_ADDRESS,
        second.sessionAddr,
        network,
      ),
    ];

    const result = await service.bootstrapSessionImportPreviews(previews, network, {
      [first.sessionAddr]: PRIV_KEY_1,
      [second.sessionAddr]: PRIV_KEY_2,
    });

    expect(result.wallet.accounts.map((account) => account.name)).toEqual([
      'Session 1',
      'Session 2',
    ]);
  });

  it('does not write metadata or wallet state when any selected key is invalid', async () => {
    const first = await makeSessionRecord(PRIV_KEY_1);
    const second = await makeSessionRecord(PRIV_KEY_2);
    const records = {
      [first.sessionAddr]: first.record,
      [second.sessionAddr]: second.record,
    };
    const provider = {
      getSession: jest.fn(async (_master: string, sessionAddr: string) => records[sessionAddr]),
    } as unknown as GnoProvider;
    const repository = makeSessionRepository();
    const walletService = makeWalletService(new AdenaWallet());
    const service = makeService(provider, repository, walletService);

    const previews: SessionImportPreview[] = [
      await service.previewSessionImportForAddress(
        PRIV_KEY_1,
        MASTER_ADDRESS,
        first.sessionAddr,
        network,
      ),
      await service.previewSessionImportForAddress(
        PRIV_KEY_2,
        MASTER_ADDRESS,
        second.sessionAddr,
        network,
      ),
    ];

    await expect(
      service.commitSessionImports(previews, network, {
        [first.sessionAddr]: PRIV_KEY_1,
        [second.sessionAddr]: PRIV_KEY_1,
      }),
    ).rejects.toMatchObject({
      reason: 'session_pubkey_mismatch',
    } satisfies Partial<SessionImportError>);
    expect(repository.sessions).toEqual({});
    expect(walletService.updateWallet).not.toHaveBeenCalled();
  });
});
