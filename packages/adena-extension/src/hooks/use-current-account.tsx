import { WalletState } from '@states/index';
import { Account } from 'adena-module';
import { useRecoilState } from 'recoil';
import { useAdenaContext, useWalletContext } from './use-context';
import { useNetwork } from './use-network';
import { useCallback } from 'react';
import { useEvent } from './use-event';
import { EventMessage } from '@inject/message/event-message';

export const useCurrentAccount = (): {
  currentAccount: Account | null,
  currentAddress: string | null,
  changeCurrentAccount: (changedAccount: Account) => Promise<boolean>,
} => {
  const [currentAccount, setCurrentAccount] = useRecoilState(WalletState.currentAccount)
  const { accountService } = useAdenaContext();
  const { wallet } = useWalletContext();
  const { currentNetwork } = useNetwork();
  const { dispatchEvent } = useEvent();

  const changeCurrentAccount = async (
    changedAccount: Account,
  ) => {
    if (!wallet) {
      return false;
    }
    await accountService.changeCurrentAccount(changedAccount);
    const clone = wallet.clone();
    clone.currentAccountId = changedAccount.id;
    setCurrentAccount(changedAccount);
    dispatchChangedEvent(changedAccount);
    return true;
  };

  const dispatchChangedEvent = useCallback((account: Account) => {
    const address = account.getAddress(currentNetwork.addressPrefix);
    const message = EventMessage.event('changedAccount', address);
    dispatchEvent(message);
  }, [currentNetwork]);

  return {
    currentAccount,
    currentAddress: currentAccount?.getAddress(currentNetwork?.addressPrefix ?? 'g') || null,
    changeCurrentAccount
  };
};