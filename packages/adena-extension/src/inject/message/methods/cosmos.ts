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
import { InjectionMessage, InjectionMessageInstance } from '../message';
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
  try {
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
  } catch (error) {
    console.warn('[cosmosEnable] unexpected error:', error);
    sendResponse(
      createCosmosResponse(
        CosmosResponseExecuteType.ENABLE_COSMOS,
        'failure',
        message.key,
        { error: (error as Error)?.message ?? String(error) },
        WalletResponseFailureType.UNEXPECTED_ERROR,
      ),
    );
  }
};

export const cosmosGetKey = async (
  core: InjectCore,
  message: InjectionMessage,
  sendResponse: (response: any) => void,
): Promise<void> => {
  try {
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
    const isLocked = await core.isLockedBy(inMemoryKey);
    if (isLocked) {
      // WALLET_LOCKED is one of the few failure types already in the SDK's
      // `WalletMessageInfo` table, so we can use the standard message builder
      // here and the dApp sees an identical response shape to Gno:
      // `{ code: 2000, type: 'WALLET_LOCKED', message: 'Adena is Locked.', ... }`.
      sendResponse(
        InjectionMessageInstance.failure(
          WalletResponseFailureType.WALLET_LOCKED,
          {},
          message.key,
        ),
      );
      return;
    }

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
  } catch (error) {
    console.warn('[cosmosGetKey] unexpected error:', error);
    sendResponse(
      createCosmosResponse(
        CosmosResponseExecuteType.GET_COSMOS_KEY,
        'failure',
        message.key,
        { error: (error as Error)?.message ?? String(error) },
        WalletResponseFailureType.UNEXPECTED_ERROR,
      ),
    );
  }
};

export const cosmosSignAmino = async (
  core: InjectCore,
  message: InjectionMessage,
  sendResponse: (response: any) => void,
): Promise<void> => {
  try {
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

    // SIGN_REJECTED is in the SDK's `WalletMessageInfo` table so the standard
    // builder fills in the human-readable `message` ("The signature has been
    // rejected by the user.") and Gno-compatible `code: 4000`.
    HandlerMethod.createPopup(
      RoutePath.ApproveSignCosmos,
      message,
      InjectionMessageInstance.failure(
        WalletResponseRejectType.SIGN_REJECTED,
        {},
        message.key,
      ),
      sendResponse,
    );
  } catch (error) {
    console.warn('[cosmosSignAmino] unexpected error:', error);
    sendResponse(
      createCosmosResponse(
        CosmosResponseExecuteType.SIGN_COSMOS_AMINO,
        'failure',
        message.key,
        { error: (error as Error)?.message ?? String(error) },
        WalletResponseFailureType.UNEXPECTED_ERROR,
      ),
    );
  }
};

export const cosmosSignDirect = async (
  core: InjectCore,
  message: InjectionMessage,
  sendResponse: (response: any) => void,
): Promise<void> => {
  try {
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

    // Rehydrate to validate the wire format before showing the approval UI;
    // the popup itself re-deserializes to produce the signing input.
    deserializeSignDoc(params.signDoc);

    HandlerMethod.createPopup(
      RoutePath.ApproveSignCosmos,
      message,
      InjectionMessageInstance.failure(
        WalletResponseRejectType.SIGN_REJECTED,
        {},
        message.key,
      ),
      sendResponse,
    );
  } catch (error) {
    console.warn('[cosmosSignDirect] unexpected error:', error);
    sendResponse(
      createCosmosResponse(
        CosmosResponseExecuteType.SIGN_COSMOS_DIRECT,
        'failure',
        message.key,
        { error: (error as Error)?.message ?? String(error) },
        WalletResponseFailureType.UNEXPECTED_ERROR,
      ),
    );
  }
};

export const cosmosSendTx = async (
  core: InjectCore,
  message: InjectionMessage,
  sendResponse: (response: any) => void,
): Promise<void> => {
  try {
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
  } catch (error) {
    console.warn('[cosmosSendTx] unexpected error:', error);
    sendResponse(
      createCosmosResponse(
        CosmosResponseExecuteType.SEND_COSMOS_TX,
        'failure',
        message.key,
        { error: (error as Error)?.message ?? String(error) },
        WalletResponseFailureType.UNEXPECTED_ERROR,
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
