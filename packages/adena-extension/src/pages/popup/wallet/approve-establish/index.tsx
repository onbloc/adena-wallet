import React, { useCallback, useEffect, useState } from 'react';
import WalletConnect from '@components/pages/approve-establish/wallet-connect/wallet-connect';
import DefaultFavicon from '@assets/favicon-default.svg';
import {
  createFaviconByHostname,
  decodeParameter,
  getSiteName,
  parseParameters,
} from '@common/utils/client-utils';
import { fetchHealth } from '@common/utils/fetch-utils';
import { InjectionMessage, InjectionMessageInstance } from '@inject/message';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useNetwork } from '@hooks/use-network';
import { RoutePath } from '@types';

const ApproveEstablishContainer: React.FC = () => {
  const normalNavigate = useNavigate();
  const location = useLocation();
  const { walletService, establishService } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();
  const { currentNetwork } = useNetwork();
  const [key, setKey] = useState<string>('');
  const [appName, setAppName] = useState<string>('');
  const [hostname, setHostname] = useState<string>('');
  const [protocol, setProtocol] = useState<string>('');
  const [favicon, setFavicon] = useState<string | null>(null);
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
  }, [key, hostname, currentAccount, currentNetwork]);

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
      updateFavicon(hostname);
      if (data) {
        const message = decodeParameter(data);
        setAppName(message?.data?.name ?? 'Unknown');
      }
    } catch (e) {
      console.log(e);
    }
  };

  const checkEstablished = async (): Promise<void> => {
    if (!currentAccount || !key || !hostname) {
      setLoading(true);
      return;
    }
    const siteName = getSiteName(protocol, hostname);
    const accountId = currentAccount.id ?? '';
    const isEstablished = await establishService.isEstablishedBy(accountId, siteName);
    setLoading(false);
    if (isEstablished) {
      chrome.runtime.sendMessage(InjectionMessageInstance.failure('ALREADY_CONNECTED', {}, key));
      return;
    }
  };

  const updateFavicon = async (hostname: string): Promise<void> => {
    const faviconData = await createFaviconByHostname(hostname);
    setFavicon(faviconData);
  };

  const establish = async (): Promise<void> => {
    setProcessing(true);
    const { url, healthy } = await checkHealth(currentNetwork.rpcUrl);
    if (!healthy || url !== currentNetwork.rpcUrl) {
      setResponse(InjectionMessageInstance.failure('NETWORK_TIMEOUT', {}, key));
      chrome.runtime.sendMessage(InjectionMessageInstance.failure('NETWORK_TIMEOUT', {}, key));
      return;
    }

    const siteName = getSiteName(protocol, hostname);
    const accountId = currentAccount?.id ?? '';
    const networkId = currentNetwork.id ?? '';
    await establishService.establishBy(accountId, networkId, {
      hostname: siteName,
      accountId,
      appName,
      favicon,
    });
    setResponse(InjectionMessageInstance.success('CONNECTION_SUCCESS', {}, key));
    setDone(true);
  };

  const onResponse = useCallback(() => {
    if (done && response) {
      chrome.runtime.sendMessage(response);
    }
  }, [done, response]);

  const onTimeout = (): void => {
    chrome.runtime.sendMessage(InjectionMessageInstance.failure('NETWORK_TIMEOUT', {}, key));
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
