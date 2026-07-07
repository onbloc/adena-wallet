import { useCallback, useState } from 'react';
import {
  Account,
  AdenaLedgerConnector,
  Document,
  isLedgerAccount,
  isSessionAccount,
  LedgerAccount,
} from 'adena-module';

import { GNO_ADDRESS_PREFIX as GNO_PREFIX } from '@common/constants/chain.constant';
import { isSessionMasterAccount } from '@common/utils/account-session';
import { SESSION_ADMIN_GAS_WANTED_FALLBACK } from '@common/utils/session-admin-gas';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useNetwork } from '@hooks/use-network';
import { useSessions } from '@hooks/use-sessions';
import { useConvertSessionAccounts } from '@hooks/wallet/use-convert-session-accounts';
import {
  createMessageOfRevokeAllSessions,
  createMessageOfRevokeSession,
} from '@services/transaction/message/auth/auth';

export const REVOKE_GAS_WANTED_DEFAULT = SESSION_ADMIN_GAS_WANTED_FALLBACK;
export const REVOKE_GAS_FEE_UGNOT_DEFAULT = 2_000;

type CommitResultLike = {
  check_tx?: { ResponseBase?: { Error?: unknown; Log?: string } };
  deliver_tx?: { ResponseBase?: { Error?: unknown; Log?: string } };
};

// A BROADCAST_TX_COMMIT result carries a hash even when the tx committed but
// FAILED (ante/authorization error, out of gas, etc.). Revoke must not treat
// that as success — otherwise cleanupSessionLocally would convert the session
// while the on-chain delegation is still fully active. Throw so the caller's
// catch surfaces the failure and skips local cleanup.
const assertRevokeCommitted = (result: unknown): void => {
  const commit = result as CommitResultLike | null;
  const failed =
    !!commit?.check_tx?.ResponseBase?.Error || !!commit?.deliver_tx?.ResponseBase?.Error;
  if (failed) {
    throw new Error(
      commit?.deliver_tx?.ResponseBase?.Log ||
        commit?.check_tx?.ResponseBase?.Log ||
        'Revoke transaction failed on chain',
    );
  }
};

interface RevokeOptions {
  gasWanted?: number;
  gasFeeUgnot?: number;
  memo?: string;
  document?: Document;
}

interface RevokeOneArgs {
  masterAddress: string;
  sessionAddr: string;
  sessionPublicKey: Uint8Array;
  opts?: RevokeOptions;
}

type RevokeResult =
  | { ok: true; hash: string | null }
  | { ok: false; error: string };

interface UseRevokeSessionReturn {
  isPending: boolean;
  errorMessage: string | null;
  revokeOne: (args: RevokeOneArgs) => Promise<RevokeResult>;
  revokeAll: (masterAddress: string, opts?: RevokeOptions) => Promise<RevokeResult>;
  resetError: () => void;
}

// Revokes one or all sessions belonging to a master account. The session's
// publicKey is passed in by the caller (sourced from the chain via
// useMasterSessions) so that revoke works even for sessions that have not
// been imported into this wallet. The master account must be present in the
// wallet because it is the signer.
export const useRevokeSession = (): UseRevokeSessionReturn => {
  const { wallet } = useWalletContext();
  const { sessionRepository, transactionService } = useAdenaContext();
  const { currentNetwork } = useNetwork();
  const { refetch } = useSessions();
  const { convertBySessionAddresses } = useConvertSessionAccounts();
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetError = useCallback(() => setErrorMessage(null), []);

  const resolveMaster = useCallback(
    async (masterAddress: string): Promise<Account | null> => {
      if (!wallet) return null;
      for (const account of wallet.accounts) {
        if (isSessionAccount(account)) continue;
        const addr = await account.getAddress(GNO_PREFIX);
        if (addr === masterAddress) return account;
      }
      return null;
    },
    [wallet],
  );

  const runLedgerRevoke = useCallback(
    async (masterAccount: LedgerAccount, document: Document): Promise<string | null> => {
      const connected = await AdenaLedgerConnector.openConnected();
      if (!connected) {
        throw new Error('Ledger not connected');
      }
      try {
        const ledgerConnector = AdenaLedgerConnector.fromTransport(connected);
        const { signed } = await transactionService.createTransactionWithLedger(
          ledgerConnector,
          masterAccount,
          document,
        );
        const result = await transactionService.sendTransactionByLedger(
          ledgerConnector,
          masterAccount,
          signed,
          true,
        );
        assertRevokeCommitted(result);
        return (result as { hash?: string | null })?.hash ?? null;
      } finally {
        await connected.close().catch(() => undefined);
      }
    },
    [transactionService],
  );

  const runRevoke = useCallback(
    async (
      masterAccount: Account,
      message: { type: string; value: object },
      opts: RevokeOptions,
    ): Promise<string | null> => {
      const gasWanted = opts.gasWanted ?? REVOKE_GAS_WANTED_DEFAULT;
      const gasFeeUgnot = opts.gasFeeUgnot ?? REVOKE_GAS_FEE_UGNOT_DEFAULT;
      const memo = opts.memo ?? '';

      const document =
        opts.document ??
        (await transactionService.createDocument(
          masterAccount,
          currentNetwork.chainId,
          [message],
          GNO_PREFIX,
          gasWanted,
          gasFeeUgnot,
          memo,
        ));

      if (isLedgerAccount(masterAccount)) {
        return runLedgerRevoke(masterAccount, document);
      }

      if (!wallet) {
        throw new Error('Wallet not available');
      }
      const { signed } = await transactionService.createTransaction(
        wallet,
        masterAccount,
        document,
      );
      const result = await transactionService.sendTransaction(
        wallet,
        masterAccount,
        signed,
        true,
      );
      assertRevokeCommitted(result);
      return (result as { hash?: string | null })?.hash ?? null;
    },
    [transactionService, currentNetwork.chainId, wallet, runLedgerRevoke],
  );

  const cleanupSessionLocally = useCallback(
    async (sessionAddr: string): Promise<void> => {
      // Mark non-imported cached rows as REVOKED, then convert an imported
      // SessionAccount into a normal PRIVATE_KEY account. The session private
      // key is still a valid standalone account key after revoke.
      const existing = await sessionRepository.get(sessionAddr);
      if (existing) {
        await sessionRepository.setStatus(sessionAddr, 'REVOKED');
      }
      await convertBySessionAddresses([sessionAddr]);
    },
    [sessionRepository, convertBySessionAddresses],
  );

  const cleanupMasterSessionsLocally = useCallback(
    async (masterAddress: string, sessionAddrs: string[]): Promise<void> => {
      const targetSessionAddrs = new Set(sessionAddrs);
      const storedSessions = await sessionRepository.getAll();
      for (const [sessionAddr, metadata] of Object.entries(storedSessions)) {
        if (metadata.masterAddress !== masterAddress) continue;
        if (metadata.chainId !== currentNetwork.chainId) continue;
        targetSessionAddrs.add(sessionAddr);
      }

      const targets = Array.from(targetSessionAddrs);
      for (const sessionAddr of targets) {
        const existing = await sessionRepository.get(sessionAddr);
        if (existing) {
          await sessionRepository.setStatus(sessionAddr, 'REVOKED');
        }
      }
      await convertBySessionAddresses(targets);
    },
    [sessionRepository, currentNetwork.chainId, convertBySessionAddresses],
  );

  const revokeOne = useCallback(
    async ({
      masterAddress,
      sessionAddr,
      sessionPublicKey,
      opts = {},
    }: RevokeOneArgs): Promise<RevokeResult> => {
      setErrorMessage(null);
      if (!wallet) return { ok: false, error: 'Wallet not available' };

      const masterAccount = await resolveMaster(masterAddress);
      if (!masterAccount) {
        const error = 'Master account not found in this wallet';
        setErrorMessage(error);
        return { ok: false, error };
      }
      if (!isSessionMasterAccount(masterAccount)) {
        const error = `${masterAccount.type} master is not supported for revoke yet`;
        setErrorMessage(error);
        return { ok: false, error };
      }

      setIsPending(true);
      try {
        const message = createMessageOfRevokeSession({
          creator: masterAddress,
          sessionPublicKey,
        });
        const hash = await runRevoke(masterAccount, message, opts);
        await cleanupSessionLocally(sessionAddr);
        await refetch();
        return { ok: true, hash };
      } catch (e) {
        const error = (e as Error)?.message ?? 'Revoke failed';
        setErrorMessage(error);
        return { ok: false, error };
      } finally {
        setIsPending(false);
      }
    },
    [wallet, resolveMaster, runRevoke, cleanupSessionLocally, refetch],
  );

  const revokeAll = useCallback(
    async (masterAddress: string, opts: RevokeOptions = {}): Promise<RevokeResult> => {
      setErrorMessage(null);
      if (!wallet) return { ok: false, error: 'Wallet not available' };

      const masterAccount = await resolveMaster(masterAddress);
      if (!masterAccount) {
        const error = 'Master account not found in this wallet';
        setErrorMessage(error);
        return { ok: false, error };
      }
      if (!isSessionMasterAccount(masterAccount)) {
        const error = `${masterAccount.type} master is not supported for revoke yet`;
        setErrorMessage(error);
        return { ok: false, error };
      }

      // Snapshot the session addresses (in this wallet) belonging to the
      // master BEFORE broadcasting so the local cleanup loop is deterministic
      // even if the sessionRepository is mutated concurrently elsewhere.
      const localSessionAddrs: string[] = [];
      for (const account of wallet.accounts) {
        if (!isSessionAccount(account)) continue;
        if (account.sessionConfig.masterAddress !== masterAddress) continue;
        const addr = await account.getAddress(GNO_PREFIX);
        localSessionAddrs.push(addr);
      }

      setIsPending(true);
      try {
        const message = createMessageOfRevokeAllSessions({ creator: masterAddress });
        const hash = await runRevoke(masterAccount, message, opts);
        await cleanupMasterSessionsLocally(masterAddress, localSessionAddrs);
        await refetch();
        return { ok: true, hash };
      } catch (e) {
        const error = (e as Error)?.message ?? 'Revoke failed';
        setErrorMessage(error);
        return { ok: false, error };
      } finally {
        setIsPending(false);
      }
    },
    [wallet, resolveMaster, runRevoke, cleanupMasterSessionsLocally, refetch],
  );

  return { isPending, errorMessage, revokeOne, revokeAll, resetError };
};
