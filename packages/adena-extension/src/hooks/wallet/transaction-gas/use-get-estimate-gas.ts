import { Tx } from '@gnolang/tm2-js-client';
import { useQuery, useQueryClient, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { Account, Document, documentToDefaultTx, isSessionAccount, Wallet } from 'adena-module';
import BigNumber from 'bignumber.js';

import { MINIMUM_GAS_PRICE } from '@common/constants/gas.constant';
import { GasToken } from '@common/constants/token.constant';
import { DEFAULT_GAS_WANTED } from '@common/constants/tx.constant';
import { parseStorageDeposits } from '@common/provider/gno/event-parser';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { TransactionService } from '@services/index';

import { useIsInitializedAccount } from '../use-get-account-info';
import { useGetGasPrice } from './use-get-gas-price';

export const GET_ESTIMATE_GAS_KEY = 'transactionGas/useGetEstimateGas';

const REFETCH_INTERVAL = 5_000;

export interface StorageDeposits {
  storageDeposit: number;
  unlockDeposit: number;
  storageUsage: number;
  releaseStorageUsage: number;
}

const EMPTY_STORAGE_DEPOSITS: StorageDeposits = {
  storageDeposit: 0,
  unlockDeposit: 0,
  storageUsage: 0,
  releaseStorageUsage: 0,
};

/**
 * Result of a single gas simulation.
 *
 * `gasUsed` and `storageDeposits` come from the same simulate response, so they
 * stay consistent when the max-stabilization below keeps a previous result.
 */
export interface EstimateGasResult {
  gasUsed: number;
  storageDeposits: StorageDeposits;
  hasError: boolean;
  simulateErrorMessage: string | null;
}

const ERROR_ESTIMATE_GAS_RESULT: EstimateGasResult = {
  gasUsed: 0,
  storageDeposits: EMPTY_STORAGE_DEPOSITS,
  hasError: true,
  simulateErrorMessage: '',
};

function makeGasInfoBy(
  gasUsed: number | null | undefined,
  gasPrice: number | null | undefined,
): {
  gasWanted: number;
  gasFee: number;
} {
  const gasFeeBN = BigNumber(gasUsed || 1000).multipliedBy(gasPrice || MINIMUM_GAS_PRICE);

  return {
    gasWanted: Number(DEFAULT_GAS_WANTED),
    gasFee: Number(gasFeeBN.toFixed(0, BigNumber.ROUND_UP)),
  };
}

function modifyDocument(document: Document, gasWanted: number, gasFee: number): Document {
  return {
    ...document,
    fee: {
      ...document.fee,
      gas: gasWanted.toString(),
      amount: [
        {
          denom: GasToken.denom,
          amount: gasFee.toString(),
        },
      ],
    },
  };
}

/**
 * Builds a placeholder/signed Tx used only for simulation. The fee amount does
 * not affect the simulated `gas_used` (gasWanted is always DEFAULT_GAS_WANTED),
 * so callers can pass any `gasUsed`/`gasPrice` that yields a valid document.
 */
export const makeEstimateGasTransaction = async (
  wallet: Wallet | null,
  account: Account | null,
  transactionService: TransactionService | null,
  document: Document | null | undefined,
  gasUsed: number,
  gasPrice: number | null,
  withSignTransaction = false,
): Promise<Tx | null> => {
  if (!document || !gasPrice) {
    return null;
  }

  const { gasFee, gasWanted } = makeGasInfoBy(gasUsed, gasPrice);
  if (!transactionService || !gasFee || !gasWanted || !wallet || !account) {
    return null;
  }

  const modifiedDocument = modifyDocument(document, gasWanted, gasFee);
  // SessionAccount: derive its own (session) address and pass it so the
  // placeholder Tx carries session_addr. encodeGnoTx in GnoProvider.simulateTx
  // then emits std.proto Signature field 3, which routes the node ante's
  // pubkey-address derivation against the session address instead of the
  // master caller. Without this, simulate would reject the placeholder for
  // pubkey-address mismatch (master caller + session pubkey).
  const sessionAddr = isSessionAccount(account) ? await account.getAddress('g') : undefined;
  if (!withSignTransaction) {
    return documentToDefaultTx(modifiedDocument, account.publicKey, sessionAddr);
  }

  const { signed } = await transactionService
    .createTransaction(wallet, account, modifiedDocument)
    .catch(() => {
      return {
        signed: null,
      };
    });
  if (!signed) {
    // Fallback path: createTransaction fails for accounts that can't sign
    // in-process (Ledger without an attached connector, AirGap). Pass the
    // account's pubkey so gno.land simulate can verify pub_key ↔ address
    // matching for pre-initialized accounts.
    return documentToDefaultTx(modifiedDocument, account.publicKey, sessionAddr);
  }

  return signed;
};

/**
 * Runs a single gas simulation for the given document and returns the raw
 * `gasUsed` + storage deposits.
 *
 * Stabilization: a node's simulate response is occasionally incomplete and
 * reports a lower `gas_used` (with fewer events) than the true cost. To avoid
 * under-estimating the fee, every refetch compares against the previously
 * cached result and keeps whichever has the higher `gasUsed`. Because the
 * query key is derived only from the transaction identity (not gasPrice, which
 * does not affect gas_used), the accumulated maximum survives across refetches
 * for the same transaction and only resets when the document changes.
 */
export const useGetEstimateGas = (
  document: Document | null | undefined,
  options?: UseQueryOptions<EstimateGasResult | null, Error>,
): UseQueryResult<EstimateGasResult | null> => {
  const { currentAccount, currentAddress } = useCurrentAccount();
  const { transactionService, transactionGasService } = useAdenaContext();
  const { data: gasPrice } = useGetGasPrice();
  const { wallet } = useWalletContext();
  const isInitializedAccount = useIsInitializedAccount(currentAddress);
  const queryClient = useQueryClient();

  return useQuery<EstimateGasResult | null, Error>({
    queryKey: [
      currentAccount?.id,
      currentAddress,
      GET_ESTIMATE_GAS_KEY,
      transactionGasService,
      document?.msgs || '',
      document?.memo || '',
      document?.account_number,
      document?.sequence,
      isInitializedAccount,
    ],
    queryFn: async ({ queryKey }): Promise<EstimateGasResult | null> => {
      if (!transactionGasService || !document || !gasPrice || isInitializedAccount === null) {
        return null;
      }

      const tx = await makeEstimateGasTransaction(
        wallet,
        currentAccount,
        transactionService,
        document,
        0,
        gasPrice,
        !isInitializedAccount,
      );
      if (!tx) {
        return ERROR_ESTIMATE_GAS_RESULT;
      }

      const nextResult = await transactionGasService
        .simulateTx(tx)
        .then(
          (simulateResult): EstimateGasResult => {
            return {
              gasUsed: Number(simulateResult.gas_used),
              storageDeposits: parseStorageDeposits(simulateResult.response_base?.events ?? []),
              hasError: false,
              simulateErrorMessage: null,
            };
          },
        )
        .catch(
          (e: Error): EstimateGasResult => {
            // eslint-disable-next-line no-console
            console.error('[estimate-gas] simulate failed:', e);
            return {
              ...ERROR_ESTIMATE_GAS_RESULT,
              simulateErrorMessage: e?.message || '',
            };
          },
        );

      // Keep the higher gasUsed across refetches for the same transaction.
      // Treats an errored/zero response as the lowest value, so a transient
      // failure never lowers a previously observed good estimate.
      const previous = queryClient.getQueryData<EstimateGasResult | null>(queryKey);
      if (previous && !previous.hasError && previous.gasUsed >= nextResult.gasUsed) {
        return previous;
      }

      return nextResult;
    },
    refetchInterval: REFETCH_INTERVAL,
    keepPreviousData: true,
    enabled: !!document && !!transactionGasService && !!gasPrice,
    ...options,
  });
};
