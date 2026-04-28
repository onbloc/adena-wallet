import DefaultFavicon from '@assets/favicon-default.svg';
import {
  createFaviconByHostname,
  decodeParameter,
  getSiteName,
  parseParameters,
} from '@common/utils/client-utils';
import WalletConnect from '@components/pages/approve-establish/wallet-connect/wallet-connect';
import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { InjectionMessage } from '@inject/message';
import {
  CosmosResponseExecuteType,
  EnableCosmosParams,
} from '@inject/types';
import { RoutePath } from '@types';
import {
  WalletResponseFailureType,
  WalletResponseRejectType,
  WalletResponseType,
} from '@adena-wallet/sdk';
import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// TODO: replace with `InjectionMessageInstance.success/failure` once
// `@adena-wallet/sdk` is updated to ship `WalletMessageInfo` entries for
// Cosmos types. Shared rationale with `src/inject/message/methods/cosmos.ts`.
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

function normalizeChainIds(value: unknown): string[] {
  if (typeof value === 'string') {
    return value.length > 0 ? [value] : [];
  }
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string' && v.length > 0);
  }
  return [];
}

const ApproveEstablishCosmosContainer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { walletService, establishAtomOneService } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();

  const [key, setKey] = useState<string>('');
  const [appName, setAppName] = useState<string>('');
  const [hostname, setHostname] = useState<string>('');
  const [protocol, setProtocol] = useState<string>('');
  const [favicon, setFavicon] = useState<string | null>(null);
  const [chainIds, setChainIds] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState<InjectionMessage>();
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    checkLockWallet();
  }, [walletService]);

  useEffect(() => {
    initRequest();
  }, [location]);

  useEffect(() => {
    if (currentAccount && key && hostname && chainIds.length > 0) {
      setLoading(false);
    }
  }, [currentAccount, key, hostname, chainIds]);

  const checkLockWallet = (): void => {
    walletService
      .isLocked()
      .then((locked) => locked && navigate(RoutePath.ApproveLogin + location.search));
  };

  const initRequest = async (): Promise<void> => {
    try {
      const params = parseParameters(location.search);
      setKey(params.key);
      setProtocol(params.protocol);
      setHostname(params.hostname);
      updateFavicon(`${params.protocol}//${params.hostname}`);
      if (params.data) {
        const message = decodeParameter(params.data);
        const data = (message?.data ?? {}) as EnableCosmosParams;
        setChainIds(normalizeChainIds(data.chainIds));
        setAppName(getSiteName(params.protocol, params.hostname));
      }
    } catch (e) {
      console.log(e);
    }
  };

  const updateFavicon = async (targetHostname: string): Promise<void> => {
    const faviconData = await createFaviconByHostname(targetHostname);
    setFavicon(faviconData);
  };

  const establish = async (): Promise<void> => {
    setProcessing(true);
    try {
      const siteName = getSiteName(protocol, hostname);
      const accountId = currentAccount?.id ?? '';
      // Persist a record per requested chainId so each chain is independently
      // revocable from the Connected Apps screen.
      for (const chainId of chainIds) {
        await establishAtomOneService.establishBy(accountId, chainId, {
          hostname: siteName,
          accountId,
          appName,
          favicon,
        });
      }
      setResponse(
        createCosmosResponse(CosmosResponseExecuteType.ENABLE_COSMOS, 'success', key),
      );
      setDone(true);
    } catch (error) {
      setResponse(
        createCosmosResponse(
          CosmosResponseExecuteType.ENABLE_COSMOS,
          'failure',
          key,
          { error: (error as Error)?.message ?? String(error) },
          WalletResponseFailureType.UNEXPECTED_ERROR,
        ),
      );
      setDone(true);
    }
  };

  const onResponse = useCallback(() => {
    if (done && response) {
      chrome.runtime.sendMessage(response);
    }
  }, [done, response]);

  const onTimeout = (): void => {
    chrome.runtime.sendMessage(
      createCosmosResponse(
        CosmosResponseExecuteType.ENABLE_COSMOS,
        'failure',
        key,
        undefined,
        WalletResponseFailureType.NETWORK_TIMEOUT,
      ),
    );
  };

  const onClickCancel = (): void => {
    chrome.runtime.sendMessage(
      createCosmosResponse(
        CosmosResponseExecuteType.ENABLE_COSMOS,
        'failure',
        key,
        undefined,
        WalletResponseRejectType.CONNECTION_REJECTED,
      ),
    );
    window.close();
  };

  const onClickConnect = (): void => {
    if (connected === false) {
      setConnected(true);
      establish().then(() => setConnected(true));
    }
  };

  return (
    <WalletConnect
      domain={getSiteName(protocol, hostname)}
      loading={loading}
      logo={favicon || DefaultFavicon}
      app={appName}
      processing={processing}
      done={done}
      onClickCancel={onClickCancel}
      onClickConnect={onClickConnect}
      onResponse={onResponse}
      onTimeout={onTimeout}
    />
  );
};

export default ApproveEstablishCosmosContainer;
