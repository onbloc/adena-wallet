import {
  WalletResponseFailureType,
  WalletResponseRejectType,
  WalletResponseSuccessType,
} from '@adena-wallet/sdk';
import { getSiteName } from '@common/utils/client-utils';
import { RoutePath } from '@types';
import { HandlerMethod } from '..';
import { InjectionMessage, InjectionMessageInstance } from '../message';
import { InjectCore } from './core';

export const getAccount = async (
  core: InjectCore,
  requestData: InjectionMessage,
  sendResponse: (message: any) => void,
): Promise<void> => {
  try {
    const inMemoryKey = await core.getInMemoryKey();

    const isLocked = await core.isLockedBy(inMemoryKey);
    if (isLocked) {
      sendResponse(
        InjectionMessageInstance.failure(
          WalletResponseFailureType.WALLET_LOCKED,
          {},
          requestData.key,
        ),
      );
      return;
    }

    const currentAccountAddress = await core.getCurrentAddress(inMemoryKey);
    const network = await core.getCurrentNetwork();
    if (!currentAccountAddress || !network) {
      sendResponse(
        InjectionMessageInstance.failure(WalletResponseFailureType.NO_ACCOUNT, {}, requestData.key),
      );
      return;
    }

    const accountInfo = await core.accountService.getAccountInfoByNetwork(
      currentAccountAddress,
      network.rpcUrl,
      network.chainId,
    );
    sendResponse(
      InjectionMessageInstance.success(
        WalletResponseSuccessType.GET_ACCOUNT_SUCCESS,
        { ...accountInfo, chainId: network.chainId },
        requestData.key,
      ),
    );
  } catch (error) {
    sendResponse(
      InjectionMessageInstance.failure(
        WalletResponseFailureType.NO_ACCOUNT,
        { error: error?.toString() },
        requestData.key,
      ),
    );
  }
};

export const getNetwork = async (
  core: InjectCore,
  requestData: InjectionMessage,
  sendResponse: (message: any) => void,
): Promise<void> => {
  try {
    const inMemoryKey = await core.getInMemoryKey();

    const isLocked = await core.isLockedBy(inMemoryKey);
    if (isLocked) {
      sendResponse(
        InjectionMessageInstance.failure(
          WalletResponseFailureType.WALLET_LOCKED,
          {},
          requestData.key,
        ),
      );
      return;
    }

    const currentAccountAddress = await core.getCurrentAddress(inMemoryKey);
    const network = await core.getCurrentNetwork();
    if (!currentAccountAddress || !network) {
      sendResponse(
        InjectionMessageInstance.failure(WalletResponseFailureType.NO_ACCOUNT, {}, requestData.key),
      );
      return;
    }

    sendResponse(
      InjectionMessageInstance.success(
        WalletResponseSuccessType.GET_NETWORK_SUCCESS,
        {
          chainId: network.chainId,
          networkName: network.networkName,
          addressPrefix: network.addressPrefix,
          rpcUrl: network.rpcUrl,
          indexerUrl: network.indexerUrl || null,
        },
        requestData.key,
      ),
    );
  } catch (error) {
    sendResponse(
      InjectionMessageInstance.failure(WalletResponseFailureType.NO_ACCOUNT, {}, requestData.key),
    );
  }
};

// chainGroups eligible for AddEstablish multi-chain approval. Gno covers every
// Tendermint2 network; atomone is the only Cosmos chainGroup wired into the
// AtomOne-specific establish storage today.
const SUPPORTED_CHAIN_GROUPS: ReadonlySet<string> = new Set(['gno', 'atomone']);

function normalizeChainIds(value: unknown): string[] | null {
  if (value === undefined) {
    return [];
  }
  if (typeof value === 'string') {
    return value.length > 0 ? [value] : null;
  }
  if (Array.isArray(value) && value.every((v) => typeof v === 'string' && v.length > 0)) {
    return value;
  }
  return null;
}

export const addEstablish = async (
  core: InjectCore,
  message: InjectionMessage,
  sendResponse: (message: any) => void,
): Promise<boolean> => {
  const inMemoryKey = await core.getInMemoryKey();

  const isLocked = await core.isLockedBy(inMemoryKey);

  const accountId = await core.getCurrentAccountId();
  const siteName = getSiteName(message.protocol, message.hostname);

  // chainIds is optional. `null` means malformed input (e.g. empty string,
  // mixed types); `[]` means the caller omitted the argument and expects the
  // legacy single-chain flow.
  const chainIds = normalizeChainIds(message?.data?.chainIds);
  if (chainIds === null) {
    sendResponse(
      InjectionMessageInstance.failure(WalletResponseFailureType.INVALID_FORMAT, {}, message.key),
    );
    return true;
  }

  if (chainIds.length === 0) {
    const isEstablished = await core.establishService.isEstablishedBy(accountId, siteName);
    if (isEstablished && !isLocked) {
      sendResponse(
        InjectionMessageInstance.failure(
          WalletResponseFailureType.ALREADY_CONNECTED,
          {},
          message.key,
        ),
      );
      return true;
    }

    HandlerMethod.createPopup(
      RoutePath.ApproveEstablish,
      message,
      InjectionMessageInstance.failure(
        WalletResponseRejectType.CONNECTION_REJECTED,
        {},
        message.key,
      ),
      sendResponse,
    );
    return true;
  }

  // Multi-chain path: AddEstablish acts as a unified entry point for both Gno
  // and AtomOne chainGroups. Each chainId is routed to the matching service
  // by chainGroup; chains outside the supported set are rejected up front so
  // partial writes never happen.
  for (const chainId of chainIds) {
    const chain = core.chainRegistry.getChainByChainId(chainId);
    if (!chain) {
      sendResponse(
        InjectionMessageInstance.failure(
          WalletResponseFailureType.UNADDED_NETWORK,
          { chainId },
          message.key,
        ),
      );
      return true;
    }
    if (!SUPPORTED_CHAIN_GROUPS.has(chain.chainGroup)) {
      sendResponse(
        InjectionMessageInstance.failure(
          WalletResponseFailureType.UNSUPPORTED_TYPE,
          {
            chainId,
            message: `Chain "${chainId}" belongs to an unsupported chainGroup "${chain.chainGroup}".`,
          },
          message.key,
        ),
      );
      return true;
    }
  }

  if (!isLocked) {
    const alreadyConnected = await Promise.all(
      chainIds.map((chainId) => {
        const chain = core.chainRegistry.getChainByChainId(chainId);
        if (chain?.chainGroup === 'atomone') {
          return core.establishAtomOneService.isEstablishedBy(accountId, siteName, chainId);
        }
        return core.establishService.isEstablishedBy(accountId, siteName, chainId);
      }),
    );
    if (alreadyConnected.every(Boolean)) {
      sendResponse(
        InjectionMessageInstance.failure(
          WalletResponseFailureType.ALREADY_CONNECTED,
          {},
          message.key,
        ),
      );
      return true;
    }
  }

  HandlerMethod.createPopup(
    RoutePath.ApproveEstablish,
    message,
    InjectionMessageInstance.failure(WalletResponseRejectType.CONNECTION_REJECTED, {}, message.key),
    sendResponse,
  );
  return true;
};
