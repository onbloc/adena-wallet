import {
  WalletResponseFailureType,
  WalletResponseRejectType,
  WalletResponseType,
} from '@adena-wallet/sdk';
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
  AGENT_REQUEST_PROTOCOL,
  AgentHostRequest,
  AgentHostRequestError,
  AgentHostResponse,
  agentSiteName,
  AgentTransactionParams,
  normalizeAgentName,
  parseAgentHostRequest,
  parseCreateSessionParams,
  parseRevokeSessionParams,
  parseTransactionParams,
  toErrorResponse,
} from './agent-host-protocol';

interface WalletContext {
  account: Account;
  address: string;
  network: NetworkMetainfo;
}

interface PopupRequest {
  route: RoutePath;
  type: string;
  rejectType: WalletResponseType;
  data: Record<string, unknown>;
}

const createRequestKey = (): string =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

const agentNameOf = (request: AgentHostRequest): string =>
  normalizeAgentName(request.params?.agent_name);

const requireWallet = async (core: InjectCore): Promise<string> => {
  const accountId = await core.getCurrentAccountId();
  if (!accountId) {
    throw new AgentHostRequestError('no_wallet', 'no Adena wallet is set up');
  }
  return accountId;
};

const requireConnected = async (core: InjectCore, agentName: string): Promise<void> => {
  const accountId = await requireWallet(core);
  const connected = await core.establishService.isEstablishedBy(
    accountId,
    agentSiteName(agentName),
  );
  if (!connected) {
    throw new AgentHostRequestError(
      'not_connected',
      'this agent is not connected to Adena; call connect_wallet first',
    );
  }
};

const resolveWalletContext = async (core: InjectCore): Promise<WalletContext> => {
  await requireWallet(core);

  const inMemoryKey = await core.getInMemoryKey();
  const account = await core.getCurrentAccount(inMemoryKey).catch(() => undefined);
  if (!account) {
    throw new AgentHostRequestError('wallet_locked', 'unlock Adena and retry');
  }

  const network = await core.getCurrentNetwork();
  if (!network) {
    throw new AgentHostRequestError('unsupported_network', 'Adena has no network selected');
  }

  const address = await account.getAddress(network.addressPrefix);
  return { account, address, network };
};

const requireSessionSupport = (context: WalletContext): void => {
  if (!isSessionMasterAccount(context.account)) {
    throw new AgentHostRequestError(
      'unsupported_account',
      'the current account cannot create session accounts',
    );
  }
  if (!isSessionSupportedNetwork(context.network)) {
    throw new AgentHostRequestError(
      'unsupported_network',
      'the current network does not support session accounts',
    );
  }
};

// Opens an Adena approval popup on behalf of the agent and resolves with the
// popup's answer. The requester is shown as "<agent>.agent".
const openPopup = async (agentName: string, request: PopupRequest): Promise<InjectionMessage> => {
  const key = createRequestKey();
  const message: InjectionMessage = {
    code: 0,
    key,
    type: request.type as InjectionMessage['type'],
    status: 'request',
    message: '',
    withNotification: false,
    hostname: `${agentName}.agent`,
    protocol: AGENT_REQUEST_PROTOCOL,
    data: request.data,
  };

  if (await existsPopups()) {
    await removePopups();
  }

  return new Promise<InjectionMessage>((resolve) => {
    createPopup(
      request.route,
      message,
      InjectionMessageInstance.failure(request.rejectType, {}, key),
      resolve,
    );
  });
};

const failureFrom = (response: InjectionMessage, rejectType: WalletResponseType): never => {
  const detail = response?.data as { error?: unknown; log?: unknown } | undefined;
  const reason = detail?.log ?? detail?.error ?? response?.message ?? 'request failed';
  throw new AgentHostRequestError(
    response?.type === rejectType ? 'rejected' : 'transaction_failed',
    typeof reason === 'string' ? reason : JSON.stringify(reason),
  );
};

const transactionPopupData = (
  context: WalletContext,
  tx: AgentTransactionParams,
): Record<string, unknown> => ({
  messages: tx.messages,
  memo: tx.memo,
  gasWanted: tx.gasWanted,
  gasFee: tx.gasFee,
  networkInfo: { chainId: context.network.chainId, rpcUrl: context.network.rpcUrl },
  signerAccountId: context.account.id,
});

const broadcastViaPopup = async (
  context: WalletContext,
  tx: AgentTransactionParams,
  agentName: string,
): Promise<Record<string, unknown>> => {
  const rejectType = WalletResponseRejectType.TRANSACTION_REJECTED;
  const response = await openPopup(agentName, {
    route: RoutePath.ApproveTransaction,
    type: 'DO_CONTRACT',
    rejectType,
    data: transactionPopupData(context, tx),
  });

  if (response?.status !== 'success') {
    failureFrom(response, rejectType);
  }

  const data = (response.data ?? {}) as { hash?: unknown; height?: unknown };
  return {
    tx_hash: data.hash ?? null,
    height: data.height ?? null,
    master_address: context.address,
    chain_id: context.network.chainId,
  };
};

const sessionAdminTx = async (
  context: WalletContext,
  message: { type: string; value: unknown },
): Promise<AgentTransactionParams> => {
  const { network } = context;
  const gasProvider = new GnoProvider(network.rpcUrl, network.networkId, network.fallbackRPCUrl);
  const gasFee = await resolveSessionAdminGasFee(gasProvider, SESSION_ADMIN_GAS_WANTED_FALLBACK);

  return {
    messages: [message as AgentTransactionParams['messages'][number]],
    memo: '',
    gasWanted: SESSION_ADMIN_GAS_WANTED_FALLBACK,
    gasFee,
  };
};

const handleGetStatus = async (
  core: InjectCore,
  request: AgentHostRequest,
): Promise<Record<string, unknown>> => {
  const version = chrome.runtime.getManifest().version;
  const accountId = await core.getCurrentAccountId();
  if (!accountId) {
    return { version, has_wallet: false, locked: false, connected: false };
  }

  const locked = await core.isLockedBy(await core.getInMemoryKey());
  const connected = await core.establishService.isEstablishedBy(
    accountId,
    agentSiteName(agentNameOf(request)),
  );
  const network = await core.getCurrentNetwork();

  return {
    version,
    has_wallet: true,
    locked,
    connected,
    chain_id: network?.chainId ?? null,
    rpc_url: network?.rpcUrl ?? null,
  };
};

// Asks the user to connect the agent, the way a dApp asks to connect. The
// approval popup also unlocks the wallet when needed.
const handleConnect = async (
  core: InjectCore,
  request: AgentHostRequest,
): Promise<Record<string, unknown>> => {
  const agentName = agentNameOf(request);
  const accountId = await requireWallet(core);

  const connected = await core.establishService.isEstablishedBy(
    accountId,
    agentSiteName(agentName),
  );
  if (!connected) {
    const rejectType = WalletResponseRejectType.CONNECTION_REJECTED;
    const response = await openPopup(agentName, {
      route: RoutePath.ApproveEstablish,
      type: 'ADD_ESTABLISH',
      rejectType,
      data: { name: agentName },
    });

    const alreadyConnected = response?.type === WalletResponseFailureType.ALREADY_CONNECTED;
    if (response?.status !== 'success' && !alreadyConnected) {
      failureFrom(response, rejectType);
    }
  }

  return handleGetAccount(core);
};

const handleGetAccount = async (core: InjectCore): Promise<Record<string, unknown>> => {
  const { address, network } = await resolveWalletContext(core);
  return { address, chain_id: network.chainId, rpc_url: network.rpcUrl };
};

const handleCreateSession = async (
  core: InjectCore,
  request: AgentHostRequest,
): Promise<Record<string, unknown>> => {
  const params = parseCreateSessionParams(request.params, Math.floor(Date.now() / 1000));
  const context = await resolveWalletContext(core);
  requireSessionSupport(context);

  let message: { type: string; value: unknown };
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

  const result = await broadcastViaPopup(
    context,
    await sessionAdminTx(context, message),
    params.agentName,
  );
  return { ...result, expires_at: params.expiresAt };
};

const handleRevokeSession = async (
  core: InjectCore,
  request: AgentHostRequest,
): Promise<Record<string, unknown>> => {
  const params = parseRevokeSessionParams(request.params);
  const context = await resolveWalletContext(core);
  requireSessionSupport(context);

  const message = createMessageOfRevokeSession({
    creator: context.address,
    sessionPublicKey: params.sessionPublicKey,
  });
  return broadcastViaPopup(context, await sessionAdminTx(context, message), params.agentName);
};

const handleSendTransaction = async (
  core: InjectCore,
  request: AgentHostRequest,
): Promise<Record<string, unknown>> => {
  const context = await resolveWalletContext(core);
  const tx = parseTransactionParams(request.params, context.address);
  return broadcastViaPopup(context, tx, agentNameOf(request));
};

const handleSignTransaction = async (
  core: InjectCore,
  request: AgentHostRequest,
): Promise<Record<string, unknown>> => {
  const context = await resolveWalletContext(core);
  const tx = parseTransactionParams(request.params, context.address);

  const rejectType = WalletResponseRejectType.SIGN_REJECTED;
  const response = await openPopup(agentNameOf(request), {
    route: RoutePath.ApproveSignTransaction,
    type: 'SIGN_TX',
    rejectType,
    data: transactionPopupData(context, tx),
  });

  if (response?.status !== 'success') {
    failureFrom(response, rejectType);
  }

  const data = (response.data ?? {}) as { encodedTransaction?: unknown };
  return {
    signed_tx: data.encodedTransaction ?? null,
    signer_address: context.address,
    chain_id: context.network.chainId,
  };
};

// Requests that act for the user or reveal the address need an approved
// connection; status and connect itself do not.
const CONNECTION_REQUIRED: ReadonlySet<string> = new Set([
  'get_account',
  'create_session',
  'revoke_session',
  'send_transaction',
  'sign_transaction',
]);

export const handleAgentHostMessage = async (
  inMemoryProvider: MemoryProvider,
  raw: unknown,
): Promise<AgentHostResponse> => {
  const id = typeof (raw as { id?: unknown })?.id === 'string' ? (raw as { id: string }).id : '';

  try {
    const request = parseAgentHostRequest(raw);
    const core = new InjectCore(inMemoryProvider);

    if (CONNECTION_REQUIRED.has(request.method)) {
      await requireConnected(core, agentNameOf(request));
    }

    switch (request.method) {
      case 'ping':
        return { id, result: { version: chrome.runtime.getManifest().version } };
      case 'get_status':
        return { id, result: await handleGetStatus(core, request) };
      case 'connect':
        return { id, result: await handleConnect(core, request) };
      case 'get_account':
        return { id, result: await handleGetAccount(core) };
      case 'create_session':
        return { id, result: await handleCreateSession(core, request) };
      case 'revoke_session':
        return { id, result: await handleRevokeSession(core, request) };
      case 'send_transaction':
        return { id, result: await handleSendTransaction(core, request) };
      case 'sign_transaction':
        return { id, result: await handleSignTransaction(core, request) };
      default:
        throw new AgentHostRequestError('invalid_request', 'unknown method');
    }
  } catch (error) {
    return toErrorResponse(id, error);
  }
};
