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

      // Persist the wallet (the source of truth) FIRST. If this throws, the
      // SESSIONS metadata rows are left intact, so we never end up with a
      // serialized SessionAccount that has no metadata (a dead, un-revokable
      // session). Only after the vault is saved do we drop the now-orphaned
      // metadata rows; a failure there merely leaves a harmless stale row that
      // the next chain sync reconciles, with no live account referencing it.
      await updateWallet(result.wallet);

      if (result.nextCurrentAccount) {
        await changeCurrentAccount(result.nextCurrentAccount);
      }

      for (const sessionAddr of result.convertedSessionAddrs) {
        await sessionRepository.remove(sessionAddr).catch(() => undefined);
      }
      await queryClient.invalidateQueries({ queryKey: [SESSIONS_QUERY_KEY] });

      return result;
    },
    [wallet, updateWallet, sessionRepository, changeCurrentAccount, queryClient],
  );

  return { convertBySessionAddresses };
};
