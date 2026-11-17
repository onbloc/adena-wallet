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
import { createPopup, existsPopups } from '@inject/message/methods/common';
import { InjectCore } from '@inject/message/methods/core';
import {
  createMessageOfCreateSession,
  createMessageOfRevokeSession,
} from '@services/transaction/message/auth/auth';
import { NetworkMetainfo, RoutePath } from '@types';

import { AgentApprovalQueue } from './agent-approval-queue';
import {
  AGENT_REQUEST_PROTOCOL,
  AGENT_SESSION_SPEND_DENOM,
  AgentHostRequest,
  AgentHostRequestError,
  AgentExpectedContext,
  AgentHostResponse,
  AgentPeer,
  agentSiteName,
  AgentTransactionParams,
  normalizeAgentName,
  parseAgentHostRequest,
  parseCancelParams,
  parseCreateSessionParams,
  parseRevokeSessionParams,
  parseTransactionParams,
  toErrorResponse,
} from './agent-host-protocol';
import {
  getAgentBinding,
  getMaxSpendLimitUgnot,
  isMasterRequestsAllowed,
  setAgentBinding,
} from './agent-host-settings';

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

// A backstop for approvals the agent never cancels, e.g. when the host died.
const APPROVAL_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_QUEUED_APPROVALS = 8;

const approvalQueue = new AgentApprovalQueue(MAX_QUEUED_APPROVALS);
const activeApprovals = new Map<string, AbortController>();

const cancelledError = (): AgentHostRequestError =>
  new AgentHostRequestError('cancelled', 'the agent cancelled the request');

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

const peerExe = (peer: AgentPeer | undefined): string => peer?.exe ?? '';

// A connection counts only for the executable it was approved for, so another
// local program cannot reuse an agent's connection by sending its name.
const isAgentConnected = async (
  core: InjectCore,
  accountId: string,
  agentName: string,
  peer: AgentPeer | undefined,
): Promise<boolean> => {
  const siteName = agentSiteName(agentName);
  if (!(await core.establishService.isEstablishedBy(accountId, siteName))) {
    return false;
  }
  const bound = await getAgentBinding(accountId, siteName);
  return bound !== undefined && bound === peerExe(peer);
};

const requireConnected = async (
  core: InjectCore,
  agentName: string,
  peer: AgentPeer | undefined,
): Promise<void> => {
  const accountId = await requireWallet(core);
  if (!(await isAgentConnected(core, accountId, agentName, peer))) {
    throw new AgentHostRequestError(
      'not_connected',
      'this agent is not connected to Adena, or its program changed since it was approved; ' +
        'call connect_wallet first',
    );
  }
};

// Refuses before any popup opens, so a disabled setting never prompts the user.
const requireMasterRequestsAllowed = async (): Promise<void> => {
  if (!(await isMasterRequestsAllowed())) {
    throw new AgentHostRequestError(
      'master_requests_disabled',
      'direct master account requests are turned off in Adena ' +
        '(Settings > Security & Privacy > AI Agent Connection)',
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

const showPopup = async (
  agentName: string,
  request: PopupRequest,
  signal: AbortSignal,
): Promise<InjectionMessage> => {
  // Never close a popup that belongs to another request.
  if (await existsPopups()) {
    throw new AgentHostRequestError(
      'approval_pending',
      'another approval is open in Adena; ask the user to finish it, then retry',
    );
  }
  if (signal.aborted) {
    throw cancelledError();
  }

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

  return new Promise<InjectionMessage>((resolve, reject) => {
    let settled = false;
    let windowId: number | undefined;

    const closeWindow = (): void => {
      if (windowId !== undefined) {
        chrome.windows.remove(windowId).catch(() => undefined);
      }
    };

    const finish = (complete: () => void): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
      complete();
    };

    const onAbort = (): void =>
      finish(() => {
        closeWindow();
        reject(cancelledError());
      });

    const timer = setTimeout(
      () =>
        finish(() => {
          closeWindow();
          reject(
            new AgentHostRequestError(
              'approval_timeout',
              'the user did not respond in Adena in time',
            ),
          );
        }),
      APPROVAL_TIMEOUT_MS,
    );

    signal.addEventListener('abort', onAbort);

    createPopup(
      request.route,
      message,
      InjectionMessageInstance.failure(request.rejectType, {}, key),
      (response: InjectionMessage) => finish(() => resolve(response)),
      (createdWindowId) => {
        windowId = createdWindowId;
        if (settled) {
          closeWindow();
        }
      },
    );
  });
};

// Session admin requests must act on the account and chain the agent recorded,
// e.g. a revoke must not land on another network the user switched to.
const requireExpectedContext = (context: WalletContext, expected: AgentExpectedContext): void => {
  if (expected.masterAddress && expected.masterAddress !== context.address) {
    throw new AgentHostRequestError(
      'context_mismatch',
      `Adena's current account is ${context.address}, not ${expected.masterAddress}; ` +
        'ask the user to switch accounts in Adena, then retry',
    );
  }
  if (expected.chainId && expected.chainId !== context.network.chainId) {
    throw new AgentHostRequestError(
      'context_mismatch',
      `Adena is on chain ${context.network.chainId}, not ${expected.chainId}; ` +
        'ask the user to switch networks in Adena, then retry',
    );
  }
};

// Opens an Adena approval popup on behalf of the agent and resolves with the
// popup's answer. The requester is shown as "<agent>.agent". Approvals are
// queued and can be cancelled by the host with the request id.
const openPopup = async (
  requestId: string,
  agentName: string,
  request: PopupRequest,
): Promise<InjectionMessage> => {
  const controller = new AbortController();
  activeApprovals.get(requestId)?.abort();
  activeApprovals.set(requestId, controller);

  try {
    return await approvalQueue.run(
      () => showPopup(agentName, request, controller.signal),
      controller.signal,
    );
  } finally {
    if (activeApprovals.get(requestId) === controller) {
      activeApprovals.delete(requestId);
    }
  }
};

// Called when the host channel closes: nobody is left to receive the answers.
export const cancelAllAgentApprovals = (): void => {
  activeApprovals.forEach((controller) => controller.abort());
  activeApprovals.clear();
};

const failureFrom = (response: InjectionMessage, rejectType: WalletResponseType): never => {
  const detail = response?.data as { error?: unknown; log?: unknown } | undefined;
  const reason = detail?.log ?? detail?.error ?? response?.message ?? 'request failed';
  throw new AgentHostRequestError(
    response?.type === rejectType ? 'rejected' : 'transaction_failed',
    typeof reason === 'string' ? reason : JSON.stringify(reason),
  );
};

// commit makes the popup wait for the block and fail unless the transaction
// executed, not just passed CheckTx.
const transactionPopupData = (
  context: WalletContext,
  tx: AgentTransactionParams,
  commit = false,
): Record<string, unknown> => ({
  messages: tx.messages,
  memo: tx.memo,
  gasWanted: tx.gasWanted,
  gasFee: tx.gasFee,
  networkInfo: { chainId: context.network.chainId, rpcUrl: context.network.rpcUrl },
  signerAccountId: context.account.id,
  ...(commit ? { commit: true } : {}),
});

const broadcastViaPopup = async (
  requestId: string,
  context: WalletContext,
  tx: AgentTransactionParams,
  agentName: string,
  commit = false,
): Promise<Record<string, unknown>> => {
  const rejectType = WalletResponseRejectType.TRANSACTION_REJECTED;
  const response = await openPopup(requestId, agentName, {
    route: RoutePath.ApproveTransaction,
    type: 'DO_CONTRACT',
    rejectType,
    data: transactionPopupData(context, tx, commit),
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
    rpc_url: context.network.rpcUrl,
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

// Reveals wallet details only to a connected agent.
const handleGetStatus = async (
  core: InjectCore,
  request: AgentHostRequest,
): Promise<Record<string, unknown>> => {
  const version = chrome.runtime.getManifest().version;
  const accountId = await core.getCurrentAccountId();
  if (!accountId) {
    return { version, has_wallet: false, connected: false };
  }

  const connected = await isAgentConnected(core, accountId, agentNameOf(request), request.peer);
  if (!connected) {
    return { version, has_wallet: true, connected: false };
  }

  const locked = await core.isLockedBy(await core.getInMemoryKey());
  const network = await core.getCurrentNetwork();

  return {
    version,
    has_wallet: true,
    locked,
    connected,
    master_requests_allowed: await isMasterRequestsAllowed(),
    max_spend_limit: `${await getMaxSpendLimitUgnot()}${AGENT_SESSION_SPEND_DENOM}`,
    chain_id: network?.chainId ?? null,
    rpc_url: network?.rpcUrl ?? null,
  };
};

const describeAgent = (agentName: string, peer: AgentPeer | undefined): string =>
  peer?.exe ? `${agentName} (${peer.exe})` : agentName;

// Asks the user to connect the agent, the way a dApp asks to connect. The
// approval popup also unlocks the wallet when needed. The connection is bound
// to the agent's executable; a different program must be approved again.
const handleConnect = async (
  core: InjectCore,
  request: AgentHostRequest,
): Promise<Record<string, unknown>> => {
  const agentName = agentNameOf(request);
  const siteName = agentSiteName(agentName);
  const accountId = await requireWallet(core);

  if (!(await isAgentConnected(core, accountId, agentName, request.peer))) {
    if (await core.establishService.isEstablishedBy(accountId, siteName)) {
      await core.establishService.unEstablishBy(accountId, siteName);
    }

    const rejectType = WalletResponseRejectType.CONNECTION_REJECTED;
    const response = await openPopup(request.id, agentName, {
      route: RoutePath.ApproveEstablish,
      type: 'ADD_ESTABLISH',
      rejectType,
      data: { name: describeAgent(agentName, request.peer) },
    });

    const alreadyConnected = response?.type === WalletResponseFailureType.ALREADY_CONNECTED;
    if (response?.status !== 'success' && !alreadyConnected) {
      failureFrom(response, rejectType);
    }

    const approvedAccountId = await requireWallet(core);
    await setAgentBinding(approvedAccountId, siteName, peerExe(request.peer));
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
  const maxSpendUgnot = BigInt(await getMaxSpendLimitUgnot());
  const params = parseCreateSessionParams(
    request.params,
    Math.floor(Date.now() / 1000),
    maxSpendUgnot,
  );
  const context = await resolveWalletContext(core);
  requireSessionSupport(context);
  requireExpectedContext(context, params);

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
    request.id,
    context,
    await sessionAdminTx(context, message),
    params.agentName,
    true,
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
  requireExpectedContext(context, params);

  const message = createMessageOfRevokeSession({
    creator: context.address,
    sessionPublicKey: params.sessionPublicKey,
  });
  return broadcastViaPopup(
    request.id,
    context,
    await sessionAdminTx(context, message),
    params.agentName,
    true,
  );
};

const handleSendTransaction = async (
  core: InjectCore,
  request: AgentHostRequest,
): Promise<Record<string, unknown>> => {
  await requireMasterRequestsAllowed();
  const context = await resolveWalletContext(core);
  const tx = parseTransactionParams(request.params, context.address);
  return broadcastViaPopup(request.id, context, tx, agentNameOf(request));
};

const handleSignTransaction = async (
  core: InjectCore,
  request: AgentHostRequest,
): Promise<Record<string, unknown>> => {
  await requireMasterRequestsAllowed();
  const context = await resolveWalletContext(core);
  const tx = parseTransactionParams(request.params, context.address);

  const rejectType = WalletResponseRejectType.SIGN_REJECTED;
  const response = await openPopup(request.id, agentNameOf(request), {
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

// Returns null for messages that expect no response, such as cancel.
export const handleAgentHostMessage = async (
  inMemoryProvider: MemoryProvider,
  raw: unknown,
): Promise<AgentHostResponse | null> => {
  const id = typeof (raw as { id?: unknown })?.id === 'string' ? (raw as { id: string }).id : '';

  try {
    const request = parseAgentHostRequest(raw);
    if (request.method === 'cancel') {
      activeApprovals.get(parseCancelParams(request.params))?.abort();
      return null;
    }

    const core = new InjectCore(inMemoryProvider);

    if (CONNECTION_REQUIRED.has(request.method)) {
      await requireConnected(core, agentNameOf(request), request.peer);
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
