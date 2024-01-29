import { useEffect, useState } from 'react';
import {
  LedgerAccount,
  AdenaLedgerConnector,
  Account,
  LedgerKeyring,
  deserializeAccount,
  AdenaWallet,
} from 'adena-module';

import { RoutePath } from '@types';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
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
  const { wallet, updateWallet } = useWalletContext();
  const { accountService } = useAdenaContext();
  const { currentNetwork } = useNetwork();
  const { params, navigate } = useAppNavigate<RoutePath.WebConnectLedgerSelectAccount>();
  const [selectAccountAddresses, setSelectAccountAddresses] = useState<Array<string>>([]);
  const [lastPath, setLastPath] = useState(-1);
  const [loadPath, setLoadPath] = useState(false);
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
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
      initAccounts(params.accounts.map(deserializeAccount) as LedgerAccount[]);
    }
  }, []);

  const initAccounts = async (accounts: Array<LedgerAccount>): Promise<void> => {
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
    const savedAccounts: Array<LedgerAccount> = [];
    for (const account of accounts) {
      const address = await account.getAddress(addressPrefix);
      if (selectAccountAddresses.includes(address)) {
        savedAccounts.push(account);
      }
    }

    const resultSavedAccounts = savedAccounts
      .map((account) => ({
        ...account.toData(),
        name: `Ledger ${account.hdPath + 1}`,
      }))
      .sort((x) => x.hdPath ?? 0);

    const transport = await AdenaLedgerConnector.openConnected();
    if (!transport) {
      return;
    }
    const keyring = await LedgerKeyring.fromLedger(AdenaLedgerConnector.fromTransport(transport));

    await transport.close();

    if (wallet) {
      const cloneWallet = wallet.clone();
      cloneWallet.addKeyring(keyring);

      let currentAccount = null;
      resultSavedAccounts.forEach((accountInfo) => {
        const account = LedgerAccount.fromData(accountInfo);
        cloneWallet.addAccount(account);
        currentAccount = account;
      });
      if (currentAccount) {
        await accountService.changeCurrentAccount(currentAccount);
      }

      await updateWallet(cloneWallet);

      navigate(RoutePath.WebAccountAddedComplete);
    } else {
      const newWallet = new AdenaWallet({
        accounts: [...resultSavedAccounts],
        keyrings: [keyring.toData()],
        currentAccountId: resultSavedAccounts[0]?.id,
      });
      navigate(RoutePath.WebCreatePassword, {
        state: {
          serializedWallet: await newWallet.serialize(''),
          stepLength: 5,
        },
      });
    }
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
