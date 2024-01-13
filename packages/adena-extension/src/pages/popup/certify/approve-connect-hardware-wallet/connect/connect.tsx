import React, { useCallback, useEffect, useState } from 'react';
import { AdenaLedgerConnector, AdenaWallet, Wallet, Account, serializeAccount } from 'adena-module';
import { RoutePath } from '@types';
import { ConnectRequest } from './connect-request';
import { ConnectFail } from './connect-fail';
import { ConnectRequestWallet } from './connect-request-wallet';
import { ConnectRequestWalletLoad } from './connect-request-wallet-load';
import { ConnectInit } from './connect-init';
import useAppNavigate from '@hooks/use-app-navigate';

type ConnectType =
  | 'INIT'
  | 'REQUEST'
  | 'NOT_PERMISSION'
  | 'REQUEST_WALLET'
  | 'REQUEST_WALLET_LOAD'
  | 'FAILED'
  | 'SUCCESS'
  | 'NONE';

export const ApproveConnectHardwareWalletConnect = (): JSX.Element => {
  const { navigate, reload } = useAppNavigate();
  const [connectState, setConnectState] = useState<ConnectType>('NONE');
  const [wallet, setWallet] = useState<Wallet>();

  useEffect(() => {
    setConnectState('INIT');
  }, []);

  useEffect(() => {
    if (connectState === 'FAILED') {
      const intervalRequest = setTimeout(() => {
        requestHardwareWallet();
      }, 1000);
      return () => clearTimeout(intervalRequest);
    }
    if (connectState === 'SUCCESS' && wallet) {
      const serializedAccounts = wallet.accounts.map((account: Account) =>
        serializeAccount(account),
      );
      navigate(RoutePath.ApproveHardwareWalletSelectAccount, {
        state: { accounts: serializedAccounts },
      });
    }
  }, [connectState, wallet]);

  const initWallet = async (): Promise<void> => {
    requestPermission();
  };

  const requestPermission = async (): Promise<void> => {
    setConnectState('REQUEST');
    try {
      const connected = await checkHardwareConnect();
      const transport = connected
        ? await AdenaLedgerConnector.openConnected()
        : await AdenaLedgerConnector.request();
      await transport?.close();
      setConnectState('REQUEST_WALLET');
      requestHardwareWallet();
    } catch (e) {
      setConnectState('NOT_PERMISSION');
    }
  };

  const checkHardwareConnect = async (): Promise<boolean> => {
    const devices = await AdenaLedgerConnector.devices();
    if (devices.length === 0) {
      return false;
    }

    return true;
  };

  const requestHardwareWallet = async (): Promise<void> => {
    let retry = true;
    try {
      const connectedCosmosApp = await checkHardwareConnect();
      if (!connectedCosmosApp) {
        setConnectState('NOT_PERMISSION');
        return;
      }
    } catch (e) {
      setConnectState('NOT_PERMISSION');
    }

    try {
      setConnectState('REQUEST_WALLET');
      const transport = await AdenaLedgerConnector.openConnected();
      setConnectState('REQUEST_WALLET_LOAD');
      if (!transport) {
        throw new Error('Not found Connect');
      }
      const initHdPaths = [0, 1, 2, 3, 4];
      const ledgerConnector = AdenaLedgerConnector.fromTransport(transport);
      const wallet = await AdenaWallet.createByLedger(ledgerConnector, initHdPaths);
      await transport?.close();
      setWallet(wallet);
      setConnectState('SUCCESS');
      retry = false;
    } catch (e) {
      if (e instanceof Error) {
        if (e.message !== 'The device is already open.') {
          console.log(e);
        }
      }
    }

    if (retry) {
      setConnectState('FAILED');
    }
  };

  const onClickClose = useCallback(() => {
    setConnectState('INIT');
    reload();
  }, []);

  const renderByState = (): JSX.Element => {
    if (connectState === 'INIT') {
      return <ConnectInit init={initWallet} />;
    }

    if (connectState === 'REQUEST') {
      return <ConnectRequest />;
    }

    if (connectState === 'NOT_PERMISSION') {
      return <ConnectFail retry={requestPermission} />;
    }

    if (connectState === 'REQUEST_WALLET' || connectState === 'FAILED') {
      return <ConnectRequestWallet onClickClose={onClickClose} />;
    }

    if (connectState === 'REQUEST_WALLET_LOAD') {
      return <ConnectRequestWalletLoad />;
    }

    return <></>;
  };

  return renderByState();
};
