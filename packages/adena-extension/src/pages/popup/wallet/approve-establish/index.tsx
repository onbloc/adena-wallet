import { WalletResponseFailureType, WalletResponseSuccessType } from '@adena-wallet/sdk';
import DefaultFavicon from '@assets/favicon-default.svg';
import {
  createFaviconByHostname,
  decodeParameter,
  getSiteName,
  parseParameters,
} from '@common/utils/client-utils';
import { fetchHealth } from '@common/utils/fetch-utils';
import WalletConnect from '@components/pages/approve-establish/wallet-connect/wallet-connect';
import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useNetwork } from '@hooks/use-network';
import { useNetworkProfile } from '@hooks/use-network-profile';
import { InjectionMessage, InjectionMessageInstance } from '@inject/message';
import { RoutePath } from '@types';
import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function normalizeChainIds(value: unknown): string[] {
  if (typeof value === 'string') {
    return value.length > 0 ? [value] : [];
  }
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string' && v.length > 0);
  }
  return [];
}

const ApproveEstablishContainer: React.FC = () => {
  const normalNavigate = useNavigate();
  const location = useLocation();
  const { walletService, establishService, establishAtomOneService, chainRegistry } =
    useAdenaContext();
  const { currentAccount } = useCurrentAccount();
  const { currentNetwork } = useNetwork();
  const profile = useNetworkProfile();
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
    initRequestSite();
  }, [location]);

  useEffect(() => {
    checkEstablished();
  }, [key, hostname, currentAccount, currentNetwork, chainIds]);

  const checkLockWallet = (): void => {
    walletService
      .isLocked()
      .then((locked) => locked && normalNavigate(RoutePath.ApproveLogin + location.search));
  };

  const initRequestSite = async (): Promise<void> => {
    try {
      const { key, hostname, protocol, data } = parseParameters(location.search);
      setKey(key);
      setProtocol(protocol);
      setHostname(hostname);
      updateFavicon(`${protocol}//${hostname}`);
      if (data) {
        const message = decodeParameter(data);
        setAppName(message?.data?.name ?? 'Unknown');
        setChainIds(normalizeChainIds(message?.data?.chainIds));
      }
    } catch (e) {
      console.log(e);
    }
  };

  const serviceForChainGroup = useCallback(
    (chainGroup: string | undefined) => {
      // AtomOne is the only Cosmos chainGroup wired up today; everything else
      // (including future Gno-side chainGroups) writes to the Gno service.
      return chainGroup === 'atomone' ? establishAtomOneService : establishService;
    },
    [establishService, establishAtomOneService],
  );

  const checkEstablished = async (): Promise<void> => {
    if (!currentAccount || !key || !hostname) {
      setLoading(true);
      return;
    }
    const siteName = getSiteName(protocol, hostname);
    const accountId = currentAccount.id ?? '';
    // Multi-chain requests: short-circuit only when every requested chainId is
    // already established (per the chainId's chainGroup). Legacy single-chain
    // path keeps the pre-Stage-8 hostname-only check.
    const isEstablished =
      chainIds.length > 0
        ? (
            await Promise.all(
              chainIds.map((chainId) => {
                const chain = chainRegistry.getChainByChainId(chainId);
                return serviceForChainGroup(chain?.chainGroup).isEstablishedBy(
                  accountId,
                  siteName,
                  chainId,
                );
              }),
            )
          ).every(Boolean)
        : await establishService.isEstablishedBy(accountId, siteName);
    setLoading(false);
    if (isEstablished) {
      chrome.runtime.sendMessage(
        InjectionMessageInstance.failure(WalletResponseFailureType.ALREADY_CONNECTED, {}, key),
      );
      return;
    }
  };

  const updateFavicon = async (hostname: string): Promise<void> => {
    const faviconData = await createFaviconByHostname(hostname);
    setFavicon(faviconData);
  };

  const establish = async (): Promise<void> => {
    setProcessing(true);
    const siteName = getSiteName(protocol, hostname);
    const accountId = currentAccount?.id ?? '';

    if (chainIds.length === 0) {
      const rpcUrl = profile?.chainType === 'gno' ? profile.rpcEndpoints[0] : '';
      const { url, healthy } = await checkHealth(rpcUrl);
      if (!healthy || url !== rpcUrl) {
        setResponse(
          InjectionMessageInstance.failure(WalletResponseFailureType.NETWORK_TIMEOUT, {}, key),
        );
        setDone(true);
        return;
      }

      try {
        const chainId = currentNetwork.chainId ?? '';
        await establishService.establishBy(accountId, chainId, {
          hostname: siteName,
          accountId,
          appName,
          favicon,
        });
        setResponse(
          InjectionMessageInstance.success(WalletResponseSuccessType.CONNECTION_SUCCESS, {}, key),
        );
      } catch (error) {
        setResponse(
          InjectionMessageInstance.failure(
            WalletResponseFailureType.UNEXPECTED_ERROR,
            { error: (error as Error)?.message ?? String(error) },
            key,
          ),
        );
      }
      setDone(true);
      return;
    }

    // Multi-chain: route each chainId to the matching service. On partial
    // failure, undo the entries already persisted so the popup keeps its
    // all-or-nothing UX contract.
    const persisted: Array<{ chainId: string; chainGroup: string | undefined }> = [];
    try {
      for (const chainId of chainIds) {
        const chain = chainRegistry.getChainByChainId(chainId);
        await serviceForChainGroup(chain?.chainGroup).establishBy(accountId, chainId, {
          hostname: siteName,
          accountId,
          appName,
          favicon,
        });
        persisted.push({ chainId, chainGroup: chain?.chainGroup });
      }
      setResponse(
        InjectionMessageInstance.success(WalletResponseSuccessType.CONNECTION_SUCCESS, {}, key),
      );
      setDone(true);
    } catch (error) {
      // Unwind in reverse order so rollback mirrors the persist sequence.
      await Promise.allSettled(
        [...persisted]
          .reverse()
          .map(({ chainId, chainGroup }) =>
            serviceForChainGroup(chainGroup).unEstablishBy(accountId, siteName, chainId),
          ),
      );
      setResponse(
        InjectionMessageInstance.failure(
          WalletResponseFailureType.UNEXPECTED_ERROR,
          { error: (error as Error)?.message ?? String(error) },
          key,
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
      InjectionMessageInstance.failure(WalletResponseFailureType.NETWORK_TIMEOUT, {}, key),
    );
  };

  const checkHealth = async (rpcUrl: string): Promise<{ url: string; healthy: boolean }> => {
    const healthy = await fetchHealth(rpcUrl);
    return healthy;
  };

  const onClickCancel = (): void => {
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

export default ApproveEstablishContainer;
