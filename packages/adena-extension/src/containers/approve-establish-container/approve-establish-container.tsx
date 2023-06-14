import React, { useEffect, useState } from 'react';
import WalletConnect from '@components/approve/wallet-connect/wallet-connect';
import DefaultFavicon from '@assets/favicon-default.svg';
import {
  createFaviconByHostname,
  decodeParameter,
  getSiteName,
  parseParmeters,
} from '@common/utils/client-utils';
import { InjectionMessageInstance } from '@inject/message';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useNetwork } from '@hooks/use-network';
import { RoutePath } from '@router/path';

const ApproveEstablishContainer: React.FC = () => {
  const navigate = useNavigate();
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

  useEffect(() => {
    checkLockWallet();
  }, [walletService]);

  useEffect(() => {
    initRequestSite();
  }, [location]);

  useEffect(() => {
    checkEstablised();
  }, [key, hostname, currentAccount, currentNetwork]);

  const checkLockWallet = () => {
    walletService.isLocked().then(locked => locked && navigate(RoutePath.ApproveLogin + location.search));
  };

  const initRequestSite = async () => {
    try {
      const { key, hostname, protocol, data } = parseParmeters(location.search);
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

  const checkEstablised = async () => {
    if (!currentAccount || !key || !hostname) {
      setLoading(true);
      return;
    }
    const siteName = getSiteName(protocol, hostname);
    const accountId = currentAccount.id ?? '';
    const networkId = currentNetwork.networkId;
    const isEstablised = await establishService.isEstablishedBy(
      accountId,
      networkId,
      siteName
    );
    setLoading(false);
    if (isEstablised) {
      chrome.runtime.sendMessage(InjectionMessageInstance.failure('ALREADY_CONNECTED', {}, key));
      return;
    }
  };

  const updateFavicon = async (hostname: string) => {
    const faviconData = await createFaviconByHostname(hostname);
    setFavicon(faviconData);
  };

  const establish = async () => {
    const siteName = getSiteName(protocol, hostname);
    const accountId = currentAccount?.id ?? '';
    const networkId = currentNetwork.networkId ?? '';
    await establishService.establishBy(
      accountId,
      networkId,
      {
        hostname: siteName,
        accountId,
        appName,
        favicon
      });
    chrome.runtime.sendMessage(InjectionMessageInstance.success('CONNECTION_SUCCESS', {}, key));
  }

  const onClickCancle = () => {
    window.close();
  };

  const onClickConnect = () => {
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
      onClickCancel={onClickCancle}
      onClickConnect={onClickConnect}
    />
  );
};

export default ApproveEstablishContainer;