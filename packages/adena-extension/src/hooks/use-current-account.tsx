import { EventMessage } from '@inject/message/event-message';
import { WalletState } from '@states';
import { useQuery } from '@tanstack/react-query';
import { Account } from 'adena-module';
import { useCallback } from 'react';
import { useRecoilState } from 'recoil';
import { useAdenaContext, useWalletContext } from './use-context';
import { useChain } from './use-chain';
import { useEvent } from './use-event';
import { useNetwork } from './use-network';

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
  const chain = useChain();
  const { dispatchEvent } = useEvent();

  const getCurrentAddress = useCallback(
    async (prefix?: string) => {
      if (!currentAccount) {
        return null;
      }
      return await currentAccount.getAddress(prefix ?? chain.bech32Prefix);
    },
    [currentAccount],
  );

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
      const address = await account.getAddress(chain.bech32Prefix);
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
      const address = await currentAccount.getAddress(chain.bech32Prefix);
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
