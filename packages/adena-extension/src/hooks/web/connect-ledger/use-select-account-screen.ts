import { useEffect, useState } from 'react';
import {
  LedgerAccount,
  AdenaLedgerConnector,
  Account,
  LedgerKeyring,
  deserializeAccount,
  serializeAccount,
} from 'adena-module';

import { RoutePath } from '@types';
import { useWalletContext } from '@hooks/use-context';
import { useNetwork } from '@hooks/use-network';
import useAppNavigate from '@hooks/use-app-navigate';
import { useQuery } from '@tanstack/react-query';

export type AccountInfoType = {
  index: number;
  address: string;
  hdPath: number;
  stored: boolean;
  selected: boolean;
};

export type useSelectAccountScreenReturn = {
  loadPath: boolean;
  accountInfos: AccountInfoType[];
  selectAccountAddresses: Array<string>;
  onClickSelectButton: (address: string) => void;
  onClickLoadMore: () => Promise<void>;
  onClickNextButton: () => Promise<void>;
};

const useSelectAccountScreen = (): useSelectAccountScreenReturn => {
  const { wallet } = useWalletContext();
  const { currentNetwork } = useNetwork();
  const { params, navigate } = useAppNavigate<RoutePath.WebConnectLedgerSelectAccount>();
  const [selectAccountAddresses, setSelectAccountAddresses] = useState<Array<string>>([]);
  const [lastPath, setLastPath] = useState(-1);
  const [loadPath, setLoadPath] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const LEDGER_ACCOUNT_LOAD_SIZE = 5;
  const walletAccounts = wallet?.accounts ?? [];
  const addressPrefix = currentNetwork.addressPrefix;
  const [accountInfos, setAccountInfos] = useState<AccountInfoType[]>([]);
  const { data: walletAddressList = [] } = useQuery(
    ['walletAddressList', walletAccounts],
    async () =>
      Promise.all(walletAccounts.map(async (account) => await account.getAddress(addressPrefix))),
  );

  useEffect(() => {
    if (Array.isArray(params.accounts)) {
      initAccounts(params.accounts.map(deserializeAccount));
    }
  }, []);

  const initAccounts = async (accounts: Array<Account>): Promise<void> => {
    const lastPath = accounts.map((account) => account.toData().hdPath ?? 0).reverse()[0];
    setLastPath(lastPath);
    setAccounts(accounts);
  };

  const onClickSelectButton = (address: string): void => {
    if (selectAccountAddresses.includes(address)) {
      setSelectAccountAddresses(
        selectAccountAddresses.filter((selectAddress) => selectAddress !== address),
      );
      return;
    }
    setSelectAccountAddresses([...selectAccountAddresses, address]);
  };

  const onClickLoadMore = async (): Promise<void> => {
    setLoadPath(true);
    const accountPaths = Array.from(
      { length: LEDGER_ACCOUNT_LOAD_SIZE },
      (_, index) => index + lastPath + 1,
    );
    const transport = await AdenaLedgerConnector.openConnected();
    if (!transport) {
      setLoadPath(false);
      return;
    }
    const ledgerConnector = AdenaLedgerConnector.fromTransport(transport);
    const keyring = await LedgerKeyring.fromLedger(ledgerConnector);
    const ledgerAccounts = [];
    for (const hdPath of accountPaths) {
      const ledgerAccount = await LedgerAccount.createBy(keyring, `Ledger ${hdPath + 1}`, hdPath);
      ledgerAccounts.push(ledgerAccount);
    }
    await initAccounts([...accounts, ...ledgerAccounts]);
    await transport.close();
    setLoadPath(false);
  };

  const onClickNextButton = async (): Promise<void> => {
    const savedAccounts: Array<Account> = [];
    for (const account of accounts) {
      const address = await account.getAddress(addressPrefix);
      if (selectAccountAddresses.includes(address)) {
        account.name = `${wallet?.nextLedgerAccountName}`;
        savedAccounts.push(account);
      }
    }

    const resultSavedAccounts = savedAccounts.sort((account) => account.toData().hdPath ?? 0);

    console.log('savedAccounts', savedAccounts);

    const locationState = {
      accounts: resultSavedAccounts.map((account) => serializeAccount(account)),
    };

    const routePath =
      walletAccounts.length === 0
        ? RoutePath.WebConnectLedgerPassword
        : RoutePath.WebConnectLedgerFinish;

    navigate(routePath, { state: locationState });
  };

  const mapAccountInfo = async (account: Account, index: number): Promise<AccountInfoType> => {
    const address = await account.getAddress(addressPrefix);
    const hdPath = account.toData().hdPath ?? 0;
    const stored = walletAddressList.includes(address);
    const selected = selectAccountAddresses.includes(address);
    return {
      index,
      address,
      hdPath,
      stored,
      selected,
    };
  };

  useEffect(() => {
    Promise.all(accounts.map(mapAccountInfo)).then(setAccountInfos);
  }, [accounts, selectAccountAddresses, walletAddressList]);

  return {
    loadPath,
    accountInfos,
    selectAccountAddresses,
    onClickSelectButton,
    onClickLoadMore,
    onClickNextButton,
  };
};

export default useSelectAccountScreen;
