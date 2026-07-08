import { Tx } from '@gnolang/tm2-js-client';
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import {
  Account,
  Document,
  documentToDefaultTx,
  isSessionAccount,
  Wallet,
} from 'adena-module';
import BigNumber from 'bignumber.js';

import { MINIMUM_GAS_PRICE } from '@common/constants/gas.constant';
import { GasToken } from '@common/constants/token.constant';
import { DEFAULT_GAS_WANTED } from '@common/constants/tx.constant';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { TransactionService } from '@services/index';
import { GasInfo } from '@types';

import { makeStaticSessionAdminGasInfo } from './session-admin-static-fee';
import { useGetGasPrice } from './use-get-gas-price';

export const GET_ESTIMATE_GAS_INFO_KEY = 'transactionGas/useGetSingleEstimateGas';

const REFETCH_INTERVAL = 5_000;

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

export const useGetDefaultEstimateGasInfo = (
  document: Document | null | undefined,
  options?: UseQueryOptions<GasInfo | null, Error>,
): UseQueryResult<GasInfo | null> => {
  return useGetEstimateGasInfo(document, 0, options);
};

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
  const sessionAddr = isSessionAccount(account)
    ? await account.getAddress('g')
    : undefined;
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

export const useGetEstimateGasInfo = (
  document: Document | null | undefined,
  gasUsed: number,
  options?: UseQueryOptions<GasInfo | null, Error>,
): UseQueryResult<GasInfo | null> => {
  const { currentAccount, currentAddress } = useCurrentAccount();
  const { data: gasPrice } = useGetGasPrice();
  const { wallet } = useWalletContext();
  const { transactionService, transactionGasService } = useAdenaContext();

  async function makeTransaction(document: Document | null | undefined): Promise<Tx | null> {
    if (!document || !gasPrice) {
      return null;
    }

    return makeEstimateGasTransaction(
      wallet,
      currentAccount,
      transactionService,
      document,
      gasUsed,
      gasPrice,
      true,
    );
  }

  return useQuery<GasInfo | null, Error>({
    queryKey: [
      currentAccount?.id,
      currentAddress,
      GET_ESTIMATE_GAS_INFO_KEY,
      transactionGasService,
      document?.msgs || '',
      document?.memo || '',
      document?.account_number,
      document?.sequence,
      gasUsed,
      gasPrice || 0,
    ],
    queryFn: async (): Promise<GasInfo | null> => {
      const staticGasInfo = makeStaticSessionAdminGasInfo(document);
      if (staticGasInfo) {
        return staticGasInfo;
      }

      if (!transactionGasService || !gasPrice) {
        return null;
      }

      const tx = await makeTransaction(document);
      if (!tx) {
        return null;
      }

      const resultGasUsed = await transactionGasService
        .estimateGas(tx)
        .then((gasUsed) => {
          return { gasUsed, errorMessage: null };
        })
        .catch((e) => {
          // eslint-disable-next-line no-console
          console.error('[estimate-gas] simulate failed:', e);
          const err = e as { message?: string; log?: string };
          if (err?.log) {
            // eslint-disable-next-line no-console
            console.error('[estimate-gas] simulate chain log:\n' + err.log);
          }
          return null;
        });

      if (!resultGasUsed) {
        return {
          gasFee: 0,
          gasUsed: 0,
          gasWanted: 0,
          gasPrice: 0,
          hasError: true,
          simulateErrorMessage: '',
        };
      }

      const gasFee = BigNumber(resultGasUsed.gasUsed)
        .multipliedBy(gasPrice)
        .toFixed(0, BigNumber.ROUND_UP);

      return {
        gasFee: Number(gasFee),
        gasUsed: resultGasUsed.gasUsed,
        gasWanted: resultGasUsed.gasUsed,
        gasPrice: gasPrice,
        hasError: resultGasUsed.errorMessage !== null,
        simulateErrorMessage: resultGasUsed.errorMessage,
      };
    },
    refetchInterval: REFETCH_INTERVAL,
    keepPreviousData: true,
    enabled: !!document && !!transactionGasService,
    ...options,
  });
};
