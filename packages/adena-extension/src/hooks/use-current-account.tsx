import { getDappVisibleAddress, getWalletFundingAddress } from '@common/utils/account-address';
import { isRevokedSessionAccount } from '@common/utils/account-session';
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
import { useSessions } from './use-sessions';

export const useCurrentAccount = (): {
  currentAccount: Account | null;
  currentAddress: string | null;
  currentFundingAddress: string | null;
  currentBalanceAddress: string | null;
  getCurrentAddress: (prefix?: string) => Promise<string | null>;
  changeCurrentAccount: (changedAccount: Account) => Promise<boolean>;
} => {
  const [currentAccount, setCurrentAccount] = useRecoilState(WalletState.currentAccount);
  const { accountService } = useAdenaContext();
  const { wallet } = useWalletContext();
  const { currentNetwork } = useNetwork();
  const chain = useChain();
  const { dispatchEvent } = useEvent();
  const { sessions } = useSessions();

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
    // Capture the previous account before mutating Recoil state so the emit
    // guard compares stable values, not whatever React decides to flush after
    // setCurrentAccount.
    const prevAccount = currentAccount;
    await accountService.changeCurrentAccount(changedAccount);
    setCurrentAccount(changedAccount);
    dispatchChangedEvent(prevAccount, changedAccount);
    return true;
  };

  const dispatchChangedEvent = useCallback(
    async (prevAccount: Account | null, nextAccount: Account) => {
      const nextAddress = await getDappVisibleAddress(nextAccount, chain.bech32Prefix);
      // Skip emit when the dApp-visible address has not changed (e.g. toggling
      // between a master account and one of its own SessionAccounts). dApps
      // treat `changedAccount` as a hard signal to refetch state, so emitting
      // a no-op forces wasted work.
      if (prevAccount) {
        const prevAddress = await getDappVisibleAddress(prevAccount, chain.bech32Prefix);
        if (prevAddress === nextAddress) {
          return;
        }
      }
      const message = EventMessage.event('changedAccount', nextAddress);
      dispatchEvent(message);
    },
    [chain.bech32Prefix, dispatchEvent],
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

  const sessionRevoked = isRevokedSessionAccount(currentAccount, currentAddress, sessions);

  // Address that wallet funding flows must use: send from_address/caller,
  // deposit/QR, copy-to-clipboard. For SessionAccount this resolves to the
  // master address; for other accounts it equals `currentAddress`.
  //
  // This stays the master address even while revoked: the master is still the
  // account a deposit belongs to, and the sign path forces caller=master
  // regardless of what the UI passes in.
  const { data: currentFundingAddress } = useQuery<string | null>(
    ['currentFundingAddress', currentAccount, currentNetwork],
    async () => {
      if (!currentAccount) {
        return null;
      }
      return getWalletFundingAddress(currentAccount, chain.bech32Prefix);
    },
    {
      enabled: currentAccount !== null,
    },
  );

  // Address whose balance the wallet displays. Identical to the funding address
  // except for a REVOKED session: it can no longer spend the master's funds, so
  // showing the master balance would misrepresent what the account controls.
  // The balance then belongs to the session key the user is asked to export.
  const currentBalanceAddress = sessionRevoked
    ? currentAddress ?? null
    : currentFundingAddress ?? null;

  return {
    currentAccount,
    currentAddress: currentAddress || null,
    currentFundingAddress: currentFundingAddress || null,
    currentBalanceAddress,
    getCurrentAddress,
    changeCurrentAccount,
  };
};
