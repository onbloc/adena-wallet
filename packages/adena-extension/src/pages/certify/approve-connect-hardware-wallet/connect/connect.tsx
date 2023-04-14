import React, { useEffect, useState } from 'react';
import { LedgerConnector, AdenaWallet } from 'adena-module';
import { Wallet, Account } from 'adena-module';
import { RoutePath } from '@router/path';
import { ConnectRequest } from './connect-request';
import { ConnectFail } from './connect-fail';
import { ConnectRequestWallet } from './connect-request-wallet';
import { useNavigate } from 'react-router-dom';
import { ConnectRequestWalletLoad } from './connect-request-wallet-load';
import { ConnectInit } from './connect-init';
import { serializeAccount } from 'adena-module';

type ConnectType =
  'INIT' |
  'REQUEST' |
  'NOT_PERMISSION' |
  'REQUEST_WALLET' |
  'REQUEST_WALLET_LOAD' |
  'FAILED' |
  'SUCCESS' |
  'NONE';

export const ApproveConnectHardwareWalletConnect = () => {
  const navigate = useNavigate();
  const [connectState, setConnectState] = useState<ConnectType>('NONE');
  const [wallet, setWallet] = useState<Wallet>();

  useEffect(() => {
    setConnectState('INIT');
  }, []);

  useEffect(() => {
    if (connectState === 'FAILED') {
      const intervalReqeust = setTimeout(() => {
        requestHardwareWallet();
      }, 1000);
      return () => clearTimeout(intervalReqeust);
    }
    if (connectState === 'SUCCESS' && wallet) {
      const serializedAccounts = wallet.accounts.map((account: Account) => serializeAccount(account));
      navigate(RoutePath.ApproveHardwareWalletSelectAccount, { state: { accounts: serializedAccounts } });
    }
  }, [connectState, wallet]);

  const initWallet = async () => {
    requestPermission();
  };

  const requestPermission = async () => {
    setConnectState('REQUEST');
    try {
      const transport = await LedgerConnector.request();
      await transport?.close();
      setConnectState('REQUEST_WALLET');
      requestHardwareWallet();
    } catch (e) {
      setConnectState('NOT_PERMISSION');
    }
  };

  const checkHardwareConnect = async () => {
    const devices = await LedgerConnector.devices();
    if (devices.length === 0) {
      return false;
    }

    return true;
  };

  const requestHardwareWallet = async () => {
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
      const transport = await LedgerConnector.openConnected();
      setConnectState('REQUEST_WALLET_LOAD');
      if (!transport) {
        throw new Error('Not found Connect');
      }
      const wallet = await AdenaWallet.createByLedger(new LedgerConnector(transport));
      await transport?.close();
      setWallet(wallet);
      setConnectState('SUCCESS');
      retry = false;
    } catch (e) {
      if (e instanceof Error) {
        if (e.message !== "The device is already open.") {
          console.log(e);
        }
      }
    }

    if (retry) {
      setConnectState('FAILED');
    }
  };

  const renderByState = () => {

    if (connectState === 'INIT') {
      return <ConnectInit init={initWallet} />
    }

    if (connectState === 'REQUEST') {
      return <ConnectRequest />
    }

    if (connectState === 'NOT_PERMISSION') {
      return <ConnectFail retry={requestPermission} />
    }

    if (connectState === 'REQUEST_WALLET' || connectState === 'FAILED') {
      return <ConnectRequestWallet />
    }

    if (connectState === 'REQUEST_WALLET_LOAD') {
      return <ConnectRequestWalletLoad />
    }

    return <></>;
  };

  return renderByState();
};
