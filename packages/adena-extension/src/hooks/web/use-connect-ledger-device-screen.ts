import { useState } from 'react';
import { Account, AdenaLedgerConnector, AdenaWallet, serializeAccount } from 'adena-module';

export type UseConnectLedgerDeviceScreenReturn = {
  connectState: ConnectLedgerStateType;
  setConnectState: (state: ConnectLedgerStateType) => void;
  requestPermission: () => Promise<void>;
};

export type ConnectLedgerStateType =
  | 'INIT'
  | 'REQUEST'
  | 'CONNECTION_FAILED'
  | 'REQUEST_WALLET'
  | 'LOAD_ACCOUNTS'
  | 'SELECT_ACCOUNT';

const delay = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 1000));

const useConnectLedgerDeviceScreen = (): UseConnectLedgerDeviceScreenReturn => {
  const [connectState, setConnectState] = useState<ConnectLedgerStateType>('INIT');

  const requestPermission = async (): Promise<void> => {
    setConnectState('REQUEST');
    try {
      const connected = await checkHardwareConnect();
      console.log('connected : ', connected);
      const transport = await AdenaLedgerConnector.request();

      await transport?.close();
      setConnectState('REQUEST_WALLET');

      let hasSuccess = false;
      while (!hasSuccess) {
        hasSuccess = await _requestHardwareWallet();
        await delay();
      }
    } catch (e) {
      console.log('requestPermission error', e);
      setConnectState('CONNECTION_FAILED');
    }
  };

  const _requestHardwareWallet = async (): Promise<boolean> => {
    try {
      const transport = await AdenaLedgerConnector.openConnected();
      setConnectState('LOAD_ACCOUNTS');
      if (!transport) {
        throw new Error('Not found Connect');
      }
      console.log('?');

      const initHdPaths = [0, 1, 2, 3, 4];
      const ledgerConnector = AdenaLedgerConnector.fromTransport(transport);
      const wallet = await AdenaWallet.createByLedger(ledgerConnector, initHdPaths);

      console.log('wallet', wallet);

      const serializedAccounts = wallet.accounts.map((account: Account) =>
        serializeAccount(account),
      );
      console.log('serializedAccounts', serializedAccounts);
      setConnectState('SELECT_ACCOUNT');
      return true;
    } catch (e) {
      console.log('requestHardwareWallet error', e);
    }
    return false;
  };

  const checkHardwareConnect = async (): Promise<boolean> => {
    const devices = await AdenaLedgerConnector.devices();
    return devices.length > 0;
  };

  return {
    connectState,
    setConnectState,
    requestPermission,
  };
};

export default useConnectLedgerDeviceScreen;
