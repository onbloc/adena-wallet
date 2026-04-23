import {
  WalletResponseFailureType,
  WalletResponseRejectType,
  WalletResponseType,
} from '@adena-wallet/sdk';
import { fromBech32 } from '@cosmjs/encoding';

import { CosmosLcdProvider } from '@common/provider/cosmos/cosmos-lcd-provider';
import { bytesToBase64 } from '@common/utils/encoding-util';
import {
  deserializeSignDoc,
  deserializeTxBytes,
} from '@common/utils/cosmos-serialize';
import { getSiteName } from '@common/utils/client-utils';
import {
  validateAminoSignDoc,
  validateCosmosChainId,
  validateSerializedSignDoc,
} from '@common/validation/validation-cosmos';
import { RoutePath } from '@types';
import {
  CosmosResponseExecuteType,
  EnableCosmosParams,
  GetCosmosKeyParams,
  SendCosmosTxParams,
  SignCosmosAminoParams,
  SignCosmosDirectParams,
} from '@inject/types';

import { HandlerMethod } from '..';
import { InjectionMessage } from '../message';
import { InjectCore } from './core';

// TODO: replace with `InjectionMessageInstance.success/failure` once
// `@adena-wallet/sdk` is updated so `WalletMessageInfo` contains entries for
// Cosmos request types. Until then the SDK's lookup table throws on
// destructure for these keys, so we build the response `InjectionMessage`
// directly.
function createCosmosResponse(
  type: CosmosResponseExecuteType,
  status: 'success' | 'failure',
  key: string | undefined,
  data?: Record<string, unknown>,
  message = '',
): InjectionMessage {
  return {
    code: status === 'success' ? 0 : 1,
    key,
    type: type as unknown as WalletResponseType,
    status,
    message,
    data,
  };
}

function normalizeChainIds(value: unknown): string[] | null {
  if (typeof value === 'string') {
    return value.length > 0 ? [value] : null;
  }
  if (Array.isArray(value) && value.every((v) => typeof v === 'string' && v.length > 0)) {
    return value;
  }
  return null;
}

export const cosmosEnable = async (
  core: InjectCore,
  message: InjectionMessage,
  sendResponse: (response: any) => void,
): Promise<void> => {
  const params = (message.data ?? {}) as EnableCosmosParams;
  const chainIds = normalizeChainIds(params.chainIds);
  if (!chainIds) {
    sendResponse(
      createCosmosResponse(
        CosmosResponseExecuteType.ENABLE_COSMOS,
        'failure',
        message.key,
        undefined,
        WalletResponseFailureType.INVALID_FORMAT,
      ),
    );
    return;
  }

  // Reject the entire request if any requested chainId is outside the atomone
  // group — AtomOne-only scope established in Stage 1.
  if (chainIds.some((id) => !validateCosmosChainId(id, core.chainRegistry))) {
    sendResponse(
      createCosmosResponse(
        CosmosResponseExecuteType.ENABLE_COSMOS,
        'failure',
        message.key,
        undefined,
        WalletResponseFailureType.UNSUPPORTED_TYPE,
      ),
    );
    return;
  }

  const accountId = await core.getCurrentAccountId();
  const hostname = getSiteName(message.protocol, message.hostname);

  // Short-circuit if every requested chainId is already connected — parallels
  // the Gno ALREADY_CONNECTED early-return so repeat enable calls are cheap.
  const alreadyConnected = await Promise.all(
    chainIds.map((chainId) =>
      core.establishAtomOneService.isEstablishedBy(accountId, hostname, chainId),
    ),
  );
  if (alreadyConnected.every(Boolean)) {
    sendResponse(
      createCosmosResponse(CosmosResponseExecuteType.ENABLE_COSMOS, 'success', message.key),
    );
    return;
  }

  HandlerMethod.createPopup(
    RoutePath.ApproveEstablishCosmos,
    message,
    createCosmosResponse(
      CosmosResponseExecuteType.ENABLE_COSMOS,
      'failure',
      message.key,
      undefined,
      WalletResponseRejectType.CONNECTION_REJECTED,
    ),
    sendResponse,
  );
};

export const cosmosGetKey = async (
  core: InjectCore,
  message: InjectionMessage,
  sendResponse: (response: any) => void,
): Promise<void> => {
  const { chainId } = (message.data ?? {}) as GetCosmosKeyParams;
  if (!validateCosmosChainId(chainId, core.chainRegistry)) {
    sendResponse(
      createCosmosResponse(
        CosmosResponseExecuteType.GET_COSMOS_KEY,
        'failure',
        message.key,
        undefined,
        WalletResponseFailureType.UNSUPPORTED_TYPE,
      ),
    );
    return;
  }

  const accountId = await core.getCurrentAccountId();
  const hostname = getSiteName(message.protocol, message.hostname);
  const isEstablished = await core.establishAtomOneService.isEstablishedBy(
    accountId,
    hostname,
    chainId,
  );
  if (!isEstablished) {
    sendResponse(
      createCosmosResponse(
        CosmosResponseExecuteType.GET_COSMOS_KEY,
        'failure',
        message.key,
        undefined,
        WalletResponseFailureType.NOT_CONNECTED,
      ),
    );
    return;
  }

  const inMemoryKey = await core.getInMemoryKey();
  const currentAccount = await core.getCurrentAccount(inMemoryKey);
  const chain = core.chainRegistry.getChainByChainId(chainId);
  if (!currentAccount || !chain) {
    sendResponse(
      createCosmosResponse(
        CosmosResponseExecuteType.GET_COSMOS_KEY,
        'failure',
        message.key,
        undefined,
        WalletResponseFailureType.NO_ACCOUNT,
      ),
    );
    return;
  }

  const bech32Address = await currentAccount.resolveAddress(chain.bech32Prefix);
  const { data: addressBytes } = fromBech32(bech32Address);

  // Binary fields are emitted as base64 because Uint8Array does not survive
  // `chrome.runtime.sendMessage`'s JSON encoding. Stage 4's inject wrapper
  // reconstitutes them before the dApp observes the Key.
  sendResponse(
    createCosmosResponse(CosmosResponseExecuteType.GET_COSMOS_KEY, 'success', message.key, {
      name: currentAccount.name,
      algo: 'secp256k1',
      pubKey: bytesToBase64(Array.from(currentAccount.publicKey)),
      address: bytesToBase64(Array.from(addressBytes)),
      bech32Address,
      isNanoLedger: currentAccount.type === 'LEDGER',
    }),
  );
};

export const cosmosSignAmino = async (
  core: InjectCore,
  message: InjectionMessage,
  sendResponse: (response: any) => void,
): Promise<void> => {
  const params = (message.data ?? {}) as SignCosmosAminoParams;
  if (
    typeof params.chainId !== 'string' ||
    typeof params.signer !== 'string' ||
    !validateAminoSignDoc(params.signDoc)
  ) {
    sendResponse(
      createCosmosResponse(
        CosmosResponseExecuteType.SIGN_COSMOS_AMINO,
        'failure',
        message.key,
        undefined,
        WalletResponseFailureType.INVALID_FORMAT,
      ),
    );
    return;
  }

  const gate = await ensureAtomOneEstablished(core, message, params.chainId);
  if (!gate.ok) {
    sendResponse(gate.response);
    return;
  }

  // TODO(ADN-756 Stage 5): swap this failure for
  // `HandlerMethod.createPopup(RoutePath.ApproveSignCosmos, ...)`. Stage 3
  // short-circuits so the wire contract is reachable but no unsigned state
  // can leak before the approval UI exists.
  sendResponse(
    createCosmosResponse(
      CosmosResponseExecuteType.SIGN_COSMOS_AMINO,
      'failure',
      message.key,
      undefined,
      WalletResponseFailureType.UNSUPPORTED_TYPE,
    ),
  );
};

export const cosmosSignDirect = async (
  core: InjectCore,
  message: InjectionMessage,
  sendResponse: (response: any) => void,
): Promise<void> => {
  const params = (message.data ?? {}) as SignCosmosDirectParams;
  if (
    typeof params.chainId !== 'string' ||
    typeof params.signer !== 'string' ||
    !validateSerializedSignDoc(params.signDoc)
  ) {
    sendResponse(
      createCosmosResponse(
        CosmosResponseExecuteType.SIGN_COSMOS_DIRECT,
        'failure',
        message.key,
        undefined,
        WalletResponseFailureType.INVALID_FORMAT,
      ),
    );
    return;
  }

  const gate = await ensureAtomOneEstablished(core, message, params.chainId);
  if (!gate.ok) {
    sendResponse(gate.response);
    return;
  }

  // Rehydrate the SignDoc immediately so the wire-format boundary stays
  // symmetrical with Stage 2's executor; the rebuilt object is what Stage 5
  // will hand to `signCosmos()`.
  deserializeSignDoc(params.signDoc);

  // TODO(ADN-756 Stage 5): swap this failure for
  // `HandlerMethod.createPopup(RoutePath.ApproveSignCosmos, ...)`.
  sendResponse(
    createCosmosResponse(
      CosmosResponseExecuteType.SIGN_COSMOS_DIRECT,
      'failure',
      message.key,
      undefined,
      WalletResponseFailureType.UNSUPPORTED_TYPE,
    ),
  );
};

export const cosmosSendTx = async (
  core: InjectCore,
  message: InjectionMessage,
  sendResponse: (response: any) => void,
): Promise<void> => {
  const params = (message.data ?? {}) as SendCosmosTxParams;
  if (
    typeof params.chainId !== 'string' ||
    typeof params.tx !== 'string' ||
    typeof params.mode !== 'string'
  ) {
    sendResponse(
      createCosmosResponse(
        CosmosResponseExecuteType.SEND_COSMOS_TX,
        'failure',
        message.key,
        undefined,
        WalletResponseFailureType.INVALID_FORMAT,
      ),
    );
    return;
  }

  const gate = await ensureAtomOneEstablished(core, message, params.chainId);
  if (!gate.ok) {
    sendResponse(gate.response);
    return;
  }

  const profile = core.chainRegistry
    .listNetworkProfilesByChain('atomone')
    .find((p) => p.chainId === params.chainId);
  if (!profile || profile.chainType !== 'cosmos') {
    sendResponse(
      createCosmosResponse(
        CosmosResponseExecuteType.SEND_COSMOS_TX,
        'failure',
        message.key,
        undefined,
        WalletResponseFailureType.UNSUPPORTED_TYPE,
      ),
    );
    return;
  }

  try {
    const txBytes = deserializeTxBytes(params.tx);
    const provider = new CosmosLcdProvider(profile);
    const response = await provider.broadcastTx(txBytes, mapBroadcastMode(params.mode));
    sendResponse(
      createCosmosResponse(CosmosResponseExecuteType.SEND_COSMOS_TX, 'success', message.key, {
        txhash: response.txhash,
        code: response.code,
        rawLog: response.rawLog,
        height: response.height,
      }),
    );
  } catch (error) {
    sendResponse(
      createCosmosResponse(
        CosmosResponseExecuteType.SEND_COSMOS_TX,
        'failure',
        message.key,
        { error: (error as Error)?.message ?? String(error) },
        WalletResponseFailureType.TRANSACTION_FAILED,
      ),
    );
  }
};

// ---------------------------------------------------------------------------

async function ensureAtomOneEstablished(
  core: InjectCore,
  message: InjectionMessage,
  chainId: string,
): Promise<{ ok: true } | { ok: false; response: InjectionMessage }> {
  if (!validateCosmosChainId(chainId, core.chainRegistry)) {
    return {
      ok: false,
      response: createCosmosResponse(
        message.type as unknown as CosmosResponseExecuteType,
        'failure',
        message.key,
        undefined,
        WalletResponseFailureType.UNSUPPORTED_TYPE,
      ),
    };
  }

  const accountId = await core.getCurrentAccountId();
  const hostname = getSiteName(message.protocol, message.hostname);
  const isEstablished = await core.establishAtomOneService.isEstablishedBy(
    accountId,
    hostname,
    chainId,
  );
  if (!isEstablished) {
    return {
      ok: false,
      response: createCosmosResponse(
        message.type as unknown as CosmosResponseExecuteType,
        'failure',
        message.key,
        undefined,
        WalletResponseFailureType.NOT_CONNECTED,
      ),
    };
  }

  return { ok: true };
}

function mapBroadcastMode(
  mode: string,
): 'BROADCAST_MODE_SYNC' | 'BROADCAST_MODE_ASYNC' | 'BROADCAST_MODE_BLOCK' {
  switch (mode) {
    case 'async':
      return 'BROADCAST_MODE_ASYNC';
    case 'block':
      return 'BROADCAST_MODE_BLOCK';
    case 'sync':
    default:
      return 'BROADCAST_MODE_SYNC';
  }
}
