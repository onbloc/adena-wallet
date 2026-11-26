import { fromBase64, toBase64 } from '@cosmjs/encoding';
import { normalizeSessionAccount, SessionAccountInfo } from '@gnolang/gno-js-client';

import { AppError, AppErrorCode } from '../../../core/errors';
import { Network } from '../../../domain/network';
import { ChainSession, coversPath, MAX_TOKEN_REALM_LOOKUPS } from '../../../domain/session-card';
import { parseCoin } from '../../../utils/amount';
import { ConcurrencyLimiter } from '../../../utils/concurrency-limiter';
import { CreateSessionRequest, SessionRepository } from '../session-repository';
import { GnoMessage, GnoMessageType } from './gno-messages';
import { GnoProvider, GnoProviderFactory } from './gno-provider';

// Public functions that let a caller move tokens it holds or approve someone else to.
const TOKEN_FUNCTIONS = new Set(['Transfer', 'TransferFrom', 'Approve', 'SafeTransferFrom', 'SetApprovalForAll']);
const TOKEN_LOOKUP_CONCURRENCY = 4;

const toNetworkError = (error: unknown): AppError =>
  error instanceof AppError ? error : new AppError(AppErrorCode.NETWORK_ERROR, (error as Error)?.message, { cause: error });

// Coins string -> amount of the native denom ("" or another denom -> '0').
const nativeAmount = (coins: string | undefined, denom: string): string =>
  (coins ?? '').split(',').map(coin => parseCoin(coin.trim())).find(coin => coin?.denom === denom)?.amount ?? '0';

// The chain reports amino JSON ({"@type", value}) once the session has signed a tx, null before.
const publicKeyOf = (raw: unknown): string | undefined => {
  const value = (raw as { value?: unknown } | null | undefined)?.value;

  return typeof value === 'string' && value ? value : undefined;
};

export const toChainSession = (info: SessionAccountInfo, denom: string): ChainSession => ({
  address: info.address,
  masterAddress: info.master_address,
  publicKey: publicKeyOf(info.public_key),
  allowPaths: info.allow_paths ?? [],
  spendLimit: nativeAmount(info.spend_limit, denom),
  spendUsed: nativeAmount(info.spend_used, denom),
  spendPeriod: info.spend_period ?? 0,
  spendResetAt: info.spend_reset ?? 0,
  expiresAt: info.expires_at ?? 0,
  accountNumber: info.account_number ?? '0',
  sequence: info.sequence ?? '0',
});

// auth/accounts/<master>/session(s) answers JSON `null` (or nothing) when there is no session, which
// gno-js-client 3.1.0 does not handle, so the queries are made here.
const querySessions = async (provider: GnoProvider, path: string): Promise<unknown> => {
  const { ResponseBase } = (await provider.abciQuery({ path, data: new Uint8Array(), height: 0, prove: false })).response;
  const raw = ResponseBase.Data ? new TextDecoder().decode(fromBase64(ResponseBase.Data)).trim() : '';

  return raw ? JSON.parse(raw) : null;
};

export class GnoSessionRepository implements SessionRepository {
  constructor(private readonly providerFactory: GnoProviderFactory) {}

  private provider(network: Network): Promise<GnoProvider> {
    return this.providerFactory(network.rpcUrl).catch((error) => {
      throw toNetworkError(error);
    });
  }

  async listSessions(masterAddress: string, network: Network): Promise<ChainSession[]> {
    const provider = await this.provider(network);

    try {
      const sessions = await querySessions(provider, `auth/accounts/${masterAddress}/sessions`);

      return Array.isArray(sessions) ? sessions.map(raw => toChainSession(normalizeSessionAccount(raw), network.nativeToken.denom)) : [];
    }
    catch (error) {
      throw toNetworkError(error);
    }
  }

  async findSession(masterAddress: string, sessionAddress: string, network: Network): Promise<ChainSession | null> {
    const provider = await this.provider(network);

    try {
      const session = await querySessions(provider, `auth/accounts/${masterAddress}/session/${sessionAddress}`);

      return session && typeof session === 'object' ? toChainSession(normalizeSessionAccount(session), network.nativeToken.denom) : null;
    }
    catch (error) {
      throw toNetworkError(error);
    }
  }

  buildCreateMessages(request: CreateSessionRequest, network: Network): GnoMessage[] {
    return [{
      type: GnoMessageType.AUTH_CREATE_SESSION,
      value: {
        creator: request.masterAddress,
        session_key: toBase64(request.publicKey),
        expires_at: String(request.expiresAt),
        allow_paths: request.allowPaths,
        spend_limit: `${request.spendLimit}${network.nativeToken.denom}`,
        spend_period: String(request.spendPeriod),
      },
    }];
  }

  buildRevokeMessages(masterAddress: string, publicKey: string): GnoMessage[] {
    return [{ type: GnoMessageType.AUTH_REVOKE_SESSION, value: { creator: masterAddress, session_key: publicKey } }];
  }

  buildRevokeAllMessages(masterAddress: string): GnoMessage[] {
    return [{ type: GnoMessageType.AUTH_REVOKE_ALL_SESSIONS, value: { creator: masterAddress } }];
  }

  buildSendMessages(masterAddress: string, toAddress: string, amount: string, network: Network): GnoMessage[] {
    return [{ type: GnoMessageType.BANK_MSG_SEND, value: { from_address: masterAddress, to_address: toAddress, amount: `${amount}${network.nativeToken.denom}` } }];
  }

  async listRealms(path: string, network: Network): Promise<string[]> {
    const provider = await this.provider(network);

    try {
      // vm/qpaths matches a string prefix, so "gno.land/r/foo" also returns "gno.land/r/foobar".
      return (await provider.getRealmPaths(path)).filter(item => coversPath(path, item));
    }
    catch (error) {
      throw toNetworkError(error);
    }
  }

  async findTokenRealms(paths: string[], network: Network): Promise<string[]> {
    const provider = await this.provider(network);
    const limiter = new ConcurrencyLimiter(TOKEN_LOOKUP_CONCURRENCY);
    const results = await Promise.all(paths.slice(0, MAX_TOKEN_REALM_LOOKUPS).map(path => limiter.run(async () => {
      try {
        const signatures = await provider.getFunctionSignatures(path);

        return signatures.some(signature => TOKEN_FUNCTIONS.has(signature.FuncName)) ? path : null;
      }
      catch (error) {
        throw toNetworkError(error);
      }
    })));

    return results.filter((path): path is string => path !== null);
  }
}
