import { WalletResponseRejectType } from '@adena-wallet/sdk';
import { Account } from 'adena-module';

import { GnoProvider } from '@common/provider/gno/gno-provider';
import { MemoryProvider } from '@common/provider/memory/memory-provider';
import { isSessionMasterAccount, isSessionSupportedNetwork } from '@common/utils/account-session';
import {
  resolveSessionAdminGasFee,
  SESSION_ADMIN_GAS_WANTED_FALLBACK,
} from '@common/utils/session-admin-gas';
import { InjectionMessage, InjectionMessageInstance } from '@inject/message/message';
import { createPopup, existsPopups, removePopups } from '@inject/message/methods/common';
import { InjectCore } from '@inject/message/methods/core';
import {
  createMessageOfCreateSession,
  createMessageOfRevokeSession,
} from '@services/transaction/message/auth/auth';
import { NetworkMetainfo, RoutePath } from '@types';

import {
  AgentHostRequest,
  AgentHostRequestError,
  AgentHostResponse,
  parseAgentHostRequest,
  parseCreateSessionParams,
  parseRevokeSessionParams,
  toErrorResponse,
} from './agent-host-protocol';

const AGENT_REQUEST_PROTOCOL = 'agent:';

interface MasterContext {
  account: Account;
  address: string;
  network: NetworkMetainfo;
}

type SessionAdminMessage = { type: string; value: unknown };

const createRequestKey = (): string =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

const resolveMasterContext = async (core: InjectCore): Promise<MasterContext> => {
  const accountId = await core.getCurrentAccountId();
  if (!accountId) {
    throw new AgentHostRequestError('no_wallet', 'no Adena wallet is set up');
  }

  const inMemoryKey = await core.getInMemoryKey();
  const account = await core.getCurrentAccount(inMemoryKey).catch(() => undefined);
  if (!account) {
    throw new AgentHostRequestError('wallet_locked', 'unlock Adena and retry');
  }
  if (!isSessionMasterAccount(account)) {
    throw new AgentHostRequestError(
      'unsupported_account',
      'the current account cannot create session accounts',
    );
  }

  const network = await core.getCurrentNetwork();
  if (!network || !isSessionSupportedNetwork(network)) {
    throw new AgentHostRequestError(
      'unsupported_network',
      'the current network does not support session accounts',
    );
  }

  const address = await account.getAddress(network.addressPrefix);
  return { account, address, network };
};

// Reuses the transaction approval popup, which already renders and signs
// session admin messages, so the user approves agent sessions on the same
// screen as wallet-initiated ones.
const approveViaPopup = async (
  context: MasterContext,
  message: SessionAdminMessage,
  agentName: string,
): Promise<Record<string, unknown>> => {
  const { network } = context;
  const gasProvider = new GnoProvider(network.rpcUrl, network.networkId, network.fallbackRPCUrl);
  const gasFee = await resolveSessionAdminGasFee(gasProvider, SESSION_ADMIN_GAS_WANTED_FALLBACK);

  const key = createRequestKey();
  const request: InjectionMessage = {
    code: 0,
    key,
    type: 'DO_CONTRACT' as InjectionMessage['type'],
    status: 'request',
    message: '',
    withNotification: false,
    hostname: `${agentName}.agent`,
    protocol: AGENT_REQUEST_PROTOCOL,
    data: {
      messages: [message],
      memo: '',
      gasWanted: SESSION_ADMIN_GAS_WANTED_FALLBACK,
      gasFee,
      networkInfo: { chainId: network.chainId, rpcUrl: network.rpcUrl },
      signerAccountId: context.account.id,
    },
  };

  if (await existsPopups()) {
    await removePopups();
  }

  const response = await new Promise<InjectionMessage>((resolve) => {
    createPopup(
      RoutePath.ApproveTransaction,
      request,
      InjectionMessageInstance.failure(WalletResponseRejectType.TRANSACTION_REJECTED, {}, key),
      resolve,
    );
  });

  if (response?.status !== 'success') {
    const rejected = response?.type === WalletResponseRejectType.TRANSACTION_REJECTED;
    const detail = response?.data as { error?: unknown; log?: unknown } | undefined;
    const reason = detail?.log ?? detail?.error ?? response?.message ?? 'request failed';
    throw new AgentHostRequestError(
      rejected ? 'rejected' : 'transaction_failed',
      typeof reason === 'string' ? reason : JSON.stringify(reason),
    );
  }

  const data = (response.data ?? {}) as { hash?: unknown; height?: unknown };
  return {
    tx_hash: data.hash ?? null,
    height: data.height ?? null,
    master_address: context.address,
    chain_id: network.chainId,
  };
};

const handleGetAccount = async (core: InjectCore): Promise<Record<string, unknown>> => {
  const { address, network } = await resolveMasterContext(core);
  return {
    address,
    chain_id: network.chainId,
    rpc_url: network.rpcUrl,
  };
};

const handleCreateSession = async (
  core: InjectCore,
  request: AgentHostRequest,
): Promise<Record<string, unknown>> => {
  const params = parseCreateSessionParams(request.params, Math.floor(Date.now() / 1000));
  const context = await resolveMasterContext(core);

  let message: SessionAdminMessage;
  try {
    message = createMessageOfCreateSession({
      creator: context.address,
      sessionPublicKey: params.sessionPublicKey,
      allowPaths: params.allowPaths,
      spendLimit: params.spendLimit,
      spendPeriod: params.spendPeriod,
      expiresAt: params.expiresAt,
    });
  } catch (error) {
    throw new AgentHostRequestError(
      'invalid_params',
      error instanceof Error ? error.message : 'invalid session parameters',
    );
  }

  const result = await approveViaPopup(context, message, params.agentName);
  return { ...result, expires_at: params.expiresAt };
};

const handleRevokeSession = async (
  core: InjectCore,
  request: AgentHostRequest,
): Promise<Record<string, unknown>> => {
  const params = parseRevokeSessionParams(request.params);
  const context = await resolveMasterContext(core);
  const message = createMessageOfRevokeSession({
    creator: context.address,
    sessionPublicKey: params.sessionPublicKey,
  });
  return approveViaPopup(context, message, params.agentName);
};

export const handleAgentHostMessage = async (
  inMemoryProvider: MemoryProvider,
  raw: unknown,
): Promise<AgentHostResponse> => {
  const id = typeof (raw as { id?: unknown })?.id === 'string' ? (raw as { id: string }).id : '';

  try {
    const request = parseAgentHostRequest(raw);
    const core = new InjectCore(inMemoryProvider);

    switch (request.method) {
      case 'ping':
        return { id, result: { version: chrome.runtime.getManifest().version } };
      case 'get_account':
        return { id, result: await handleGetAccount(core) };
      case 'create_session':
        return { id, result: await handleCreateSession(core, request) };
      case 'revoke_session':
        return { id, result: await handleRevokeSession(core, request) };
      default:
        throw new AgentHostRequestError('invalid_request', 'unknown method');
    }
  } catch (error) {
    return toErrorResponse(id, error);
  }
};
