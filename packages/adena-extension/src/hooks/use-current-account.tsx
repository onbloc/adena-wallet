import { WalletState } from '@states';
import { Account } from 'adena-module';
import { useRecoilState } from 'recoil';
import { useAdenaContext, useWalletContext } from './use-context';
import { useNetwork } from './use-network';
import { useCallback } from 'react';
import { useEvent } from './use-event';
import { EventMessage } from '@inject/message/event-message';
import { useQuery } from '@tanstack/react-query';

export const useCurrentAccount = (): {
  currentAccount: Account | null;
  currentAddress: string | null;
  getCurrentAddress: (prefix?: string) => Promise<string | null>;
  changeCurrentAccount: (changedAccount: Account) => Promise<boolean>;
} => {
  const [currentAccount, setCurrentAccount] = useRecoilState(WalletState.currentAccount);
  const { accountService } = useAdenaContext();
  const { wallet } = useWalletContext();
  const { currentNetwork } = useNetwork();
  const { dispatchEvent } = useEvent();

  const getCurrentAddress = useCallback(async (prefix?: string) => {
    if (!currentAccount) {
      return null;
    }
    return await currentAccount.getAddress(prefix ?? 'g');
  }, [currentAccount]);

  const changeCurrentAccount = async (changedAccount: Account): Promise<boolean> => {
    if (!wallet) {
      return false;
    }
    await accountService.changeCurrentAccount(changedAccount);
    setCurrentAccount(changedAccount);
    dispatchChangedEvent(changedAccount);
    return true;
  };

  const dispatchChangedEvent = useCallback(
    async (account: Account) => {
      const address = await account.getAddress(currentNetwork.addressPrefix);
      const message = EventMessage.event('changedAccount', address);
      dispatchEvent(message);
    },
    [currentNetwork],
  );

  const { data: currentAddress } = useQuery<string | null>(
    ['currentAddress', currentAccount, currentNetwork],
    async () => {
      if (!currentAccount) {
        return null;
      }
      const address = await currentAccount.getAddress(currentNetwork.addressPrefix ?? 'g');
      return address;
    },
    {
      enabled: currentAccount !== null,
    },
  );

  return {
    currentAccount,
    currentAddress: currentAddress || null,
    getCurrentAddress,
    changeCurrentAccount,
  };
};
