import React, { useEffect, useState } from 'react';
import { Wallet, WalletAccount, LedgerSigner } from 'adena-module';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import { RoutePath } from '@router/path';
import { ConnectRequest } from './connect-request';
import { ConnectFail } from './connect-fail';
import { ConnectRequestWallet } from './connect-request-wallet';
import { useNavigate } from 'react-router-dom';
import { ConnectRequestWalletLoad } from './connect-request-wallet-load';

type ConnectType =
  'INIT' |
  'REQUEST' |
  'NOT_PERMISSION' |
  'REQUEST_WALLET' |
  'REQUEST_WALLET_LOAD' |
  'FAILED' |
  'SUCCESS';

export const ApproveConnectHardwareWalletConnect = () => {
  const navigate = useNavigate();
  const [openConnected, setOpenConnected] = useState(false);
  const [connectState, setConnectState] = useState<ConnectType>('INIT');
  const [wallet, setWallet] = useState<InstanceType<typeof Wallet>>();

  useEffect(() => {
    if (connectState === 'INIT') {
      initWallet();
      return;
    }
    if (connectState === 'REQUEST') {
      requestPermission();
      return;
    }
    if (connectState === 'SUCCESS' && wallet) {
      const serializedAccounts = wallet.getAccounts().map((account: InstanceType<typeof WalletAccount>) => account.serialize());
      navigate(RoutePath.ApproveHardwareWalletSelectAccount, { state: { accounts: serializedAccounts } });
      return;
    }
  }, [connectState, wallet]);

  const initWallet = async () => {
    let webUSB: TransportWebUSB | null = null;
    if (!openConnected) {
      webUSB = await TransportWebUSB.openConnected();
      setOpenConnected(webUSB !== null);
    }

    if (webUSB !== null) {
      setConnectState('REQUEST_WALLET');
      return;
    }

    setConnectState('REQUEST');
  };

  const requestPermission = async () => {
    const devices = await TransportWebUSB.list();
    if (devices.length === 0) {
      setConnectState('NOT_PERMISSION');
      return false;
    }
    setConnectState('REQUEST_WALLET');
    return true;
  };

  const checkHardwareConnect = async () => {
    try {
      const wallet = await Wallet.createByLedger([0]);
      await wallet.initAccounts();
      setConnectState('REQUEST_WALLET_LOAD');
    } catch (e) {
      console.log(e)
      setConnectState('FAILED');
    }
  };

  const requestHardwareWallet = async () => {
    setConnectState('REQUEST_WALLET');
    await checkHardwareConnect();
    try {
      const wallet = await Wallet.createByLedger([0, 1, 2, 3, 4]);
      await wallet.initAccounts();
      setWallet(wallet);
      setConnectState('SUCCESS');
    } catch (e) {
      setConnectState('FAILED');
    }
  };

  const renderByState = () => {

    if (connectState === 'REQUEST') {
      return <ConnectRequest />
    }

    if (connectState === 'NOT_PERMISSION') {
      return <ConnectFail retry={() => setConnectState('REQUEST')} />
    }

    if (connectState === 'REQUEST_WALLET' || connectState === 'FAILED') {
      return <ConnectRequestWallet active={connectState === 'FAILED'} requestHardwareWallet={requestHardwareWallet} />
    }

    if (connectState === 'REQUEST_WALLET_LOAD') {
      return <ConnectRequestWalletLoad />
    }

    return <></>;
  };

  return renderByState();
};
