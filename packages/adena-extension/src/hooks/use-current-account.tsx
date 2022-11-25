import { LocalStorageValue } from '@common/values';
import { WalletService } from '@services/index';
import { GnoClientState, WalletState } from '@states/index';
import { WalletAccount } from 'adena-module';
import { useEffect } from 'react';
import { useRecoilState } from 'recoil';

export const useCurrentAccount = (): [
  account: InstanceType<typeof WalletAccount> | null,
  updateCurrentAccountInfo: () => void,
  changeCurrentAccount: (
    address?: string | null,
    accounts?: Array<InstanceType<typeof WalletAccount>>,
  ) => void,
] => {
  const [currentAccount, setCurrentAccount] = useRecoilState(WalletState.currentAccount);
  const [gnoClient] = useRecoilState(GnoClientState.current);
  const [walletAccounts] = useRecoilState(WalletState.accounts);
  const [, setBalances] = useRecoilState(WalletState.balances);

  useEffect(() => {
    if (currentAccount?.getAddress()) {
      updateCurrentName();
    }
  }, [currentAccount?.getAddress()])

  const updateCurrentName = async () => {
    if (!currentAccount) {
      return;
    }
    const accountNames = await WalletService.loadAccountNames();
    if (accountNames[currentAccount.getAddress()]) {
      const account = currentAccount.clone();
      account.setName(accountNames[currentAccount.getAddress()]);
      setCurrentAccount(account);
    }
  }

  const updateCurrentAccountInfo = async () => {
    if (gnoClient && currentAccount) {
      const changedAccount = await WalletService.updateAccountInfo(gnoClient, currentAccount);
      setCurrentAccount(changedAccount);
    }
  };

  const changeCurrentAccount = async (
    address?: string | null,
    accounts?: Array<InstanceType<typeof WalletAccount>>,
  ) => {
    const currentAccounts = accounts ?? walletAccounts;
    if (!currentAccounts || currentAccounts.length === 0) {
      return 0;
    }

    let currentAddress = '';
    if (address) {
      await LocalStorageValue.set('CURRENT_ACCOUNT_ADDRESS', address);
      currentAddress = address;
    } else {
      currentAddress = await LocalStorageValue.get('CURRENT_ACCOUNT_ADDRESS');
    }
    if (currentAccounts.findIndex(account => account.getAddress() === currentAddress) === -1) {
      currentAddress = currentAccounts[0].getAddress();
      await LocalStorageValue.set('CURRENT_ACCOUNT_ADDRESS', currentAddress);
    }

    if (currentAccount?.getAddress() !== currentAddress) {
      setBalances([]);
    }
    const accountIndex = currentAccounts.findIndex(
      (account) => account.getAddress() === currentAddress,
    );
    const changedCurrentAccount =
      accountIndex > 0 ? currentAccounts[accountIndex] : currentAccounts[0];

    updateCurrentAccountName(changedCurrentAccount);
    setCurrentAccount(changedCurrentAccount);
  };

  const updateCurrentAccountName = async (account: InstanceType<typeof WalletAccount> | null) => {
    if (account) {
      const changedAccount = account.clone();
      const accountNames = await WalletService.loadAccountNames();
      if (Object.keys(accountNames).includes(account.getAddress())) {
        changedAccount.setName(accountNames[account.getAddress()]);
      }
    }
  };

  return [currentAccount, updateCurrentAccountInfo, changeCurrentAccount];
};
