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
import { useChain } from '@hooks/use-chain';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import useAppNavigate from '@hooks/use-app-navigate';
import { pendingWalletStore } from '@services/wallet/pending-wallet-store';
import { useQuery } from '@tanstack/react-query';
import useIndicatorStep, {
  UseIndicatorStepReturn,
} from '@hooks/wallet/broadcast-transaction/use-indicator-step';

export type AccountInfoType = {
  index: number;
  address: string;
  hdPath: number;
  accountIndex?: number;
  changeIndex?: number;
  stored: boolean;
  selected: boolean;
};

export type useSelectAccountScreenReturn = {
  indicatorInfo: UseIndicatorStepReturn;
  loadPath: boolean;
  accountInfos: AccountInfoType[];
  selectAccountAddresses: Array<string>;
  onClickSelectButton: (address: string) => void;
  onClickLoadMore: () => Promise<void>;
  deriveAddressByPath: (account: number, change: number, addressIndex: number) => Promise<string>;
  submitSelectedAccounts: (
    derivationPath: { account: number; change: number; addressIndex: number } | null,
  ) => Promise<void>;
  storedAddresses: string[];
};

const useSelectAccountScreen = (): useSelectAccountScreenReturn => {
  const { wallet, updateWallet } = useWalletContext();
  const { accountService } = useAdenaContext();
  const chain = useChain();
  const { params, navigate } = useAppNavigate<RoutePath.WebConnectLedgerSelectAccount>();
  const [selectAccountAddresses, setSelectAccountAddresses] = useState<Array<string>>([]);
  const [lastPath, setLastPath] = useState(-1);
  const [loadPath, setLoadPath] = useState(false);
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const LEDGER_ACCOUNT_LOAD_SIZE = 5;
  const walletAccounts = wallet?.accounts ?? [];
  const addressPrefix = chain.bech32Prefix;
  const [accountInfos, setAccountInfos] = useState<AccountInfoType[]>([]);
  const indicatorInfo = useIndicatorStep({
    stepMap: {
      SELECT: 2,
    },
    currentState: 'SELECT',
  });
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

  // Derives the address for an exact path via the device, for the live preview.
  const deriveAddressByPath = async (
    account: number,
    change: number,
    addressIndex: number,
  ): Promise<string> => {
    const transport = await AdenaLedgerConnector.openConnected();
    if (!transport) {
      return '';
    }
    try {
      const keyring = await LedgerKeyring.fromLedger(AdenaLedgerConnector.fromTransport(transport));
      const ledgerAccount = await LedgerAccount.createBy(keyring, 'Ledger', {
        account,
        change,
        addressIndex,
      });
      return await ledgerAccount.getAddress(addressPrefix);
    } catch {
      return '';
    } finally {
      await transport.close();
    }
  };

  // Adds the checkbox-selected accounts plus the optional derivation-path account,
  // deduplicated by address and ordered by (account', change, addressIndex). All
  // added accounts share a single keyring so account.keyringId stays resolvable.
  const submitSelectedAccounts = async (
    derivationPath: { account: number; change: number; addressIndex: number } | null,
  ): Promise<void> => {
    const selected: LedgerAccount[] = [];
    for (const account of accounts) {
      const address = await account.getAddress(addressPrefix);
      if (selectAccountAddresses.includes(address)) {
        selected.push(account);
      }
    }

    const transport = await AdenaLedgerConnector.openConnected();
    if (!transport) {
      return;
    }
    const keyring = await LedgerKeyring.fromLedger(AdenaLedgerConnector.fromTransport(transport));
    const candidates: LedgerAccount[] = [...selected];
    if (derivationPath) {
      candidates.push(
        await LedgerAccount.createBy(
          keyring,
          `Ledger ${derivationPath.addressIndex + 1}`,
          derivationPath,
        ),
      );
    }
    await transport.close();

    if (candidates.length === 0) {
      return;
    }

    const withAddress = await Promise.all(
      candidates.map(async (account) => ({
        account,
        address: await account.getAddress(addressPrefix),
      })),
    );
    withAddress.sort(
      (a, b) =>
        a.account.accountIndex - b.account.accountIndex ||
        a.account.changeIndex - b.account.changeIndex ||
        a.account.hdPath - b.account.hdPath,
    );

    // Rebuild each account's data under the single keyring id.
    const seen = new Set<string>();
    const orderedData = [];
    for (const { account, address } of withAddress) {
      if (seen.has(address)) {
        continue;
      }
      seen.add(address);
      orderedData.push({
        ...account.toData(),
        keyringId: keyring.id,
        name: `Ledger ${account.hdPath + 1}`,
      });
    }

    if (wallet) {
      const cloneWallet = wallet.clone();
      cloneWallet.addKeyring(keyring);
      let currentAccount = null;
      orderedData.forEach((data) => {
        const account = LedgerAccount.fromData(data);
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
        accounts: [...orderedData],
        keyrings: [keyring.toData()],
        currentAccountId: orderedData[0]?.id,
      });
      pendingWalletStore.set(newWallet);
      navigate(RoutePath.WebCreatePassword);
    }
  };

  const mapAccountInfo = async (account: Account, index: number): Promise<AccountInfoType> => {
    const address = await account.getAddress(addressPrefix);
    const data = account.toData();
    const hdPath = data.hdPath ?? 0;
    const stored = walletAddressList.includes(address);
    const selected = selectAccountAddresses.includes(address);
    return {
      index,
      address,
      hdPath,
      accountIndex: data.accountIndex,
      changeIndex: data.changeIndex,
      stored,
      selected,
    };
  };

  useEffect(() => {
    Promise.all(accounts.map(mapAccountInfo)).then(setAccountInfos);
  }, [accounts, selectAccountAddresses, walletAddressList]);

  return {
    indicatorInfo,
    loadPath,
    accountInfos,
    selectAccountAddresses,
    onClickSelectButton,
    onClickLoadMore,
    deriveAddressByPath,
    submitSelectedAccounts,
    storedAddresses: walletAddressList,
  };
};

export default useSelectAccountScreen;
