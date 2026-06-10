import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { SESSIONS_QUERY_KEY } from '@hooks/use-sessions';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import {
  convertSessionAccountsToPrivateKey,
  SessionAccountConversionResult,
} from '@services/wallet/session-account-conversion';

export const useConvertSessionAccounts = (): {
  convertBySessionAddresses: (
    sessionAddrs: string[],
  ) => Promise<SessionAccountConversionResult | null>;
} => {
  const { wallet, updateWallet } = useWalletContext();
  const { sessionRepository } = useAdenaContext();
  const { changeCurrentAccount } = useCurrentAccount();
  const queryClient = useQueryClient();

  const convertBySessionAddresses = useCallback(
    async (sessionAddrs: string[]): Promise<SessionAccountConversionResult | null> => {
      if (!wallet || sessionAddrs.length === 0) {
        return null;
      }

      const result = await convertSessionAccountsToPrivateKey(wallet, sessionAddrs);
      if (result.convertedSessionAddrs.length === 0) {
        return result;
      }

      for (const sessionAddr of result.convertedSessionAddrs) {
        await sessionRepository.remove(sessionAddr);
      }

      if (result.nextCurrentAccount) {
        await changeCurrentAccount(result.nextCurrentAccount);
      }
      await updateWallet(result.wallet);
      await queryClient.invalidateQueries({ queryKey: [SESSIONS_QUERY_KEY] });

      return result;
    },
    [wallet, updateWallet, sessionRepository, changeCurrentAccount, queryClient],
  );

  return { convertBySessionAddresses };
};
