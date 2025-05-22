import { MINIMUM_GAS_PRICE } from '@common/constants/gas.constant';
import { GasToken } from '@common/constants/token.constant';
import { DEFAULT_GAS_WANTED } from '@common/constants/tx.constant';
import { Tx } from '@gnolang/tm2-js-client';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { TransactionService } from '@services/index';
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { GasInfo } from '@types';
import { Document, documentToDefaultTx, Wallet } from 'adena-module';
import BigNumber from 'bignumber.js';
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
  if (!transactionService || !gasFee || !gasWanted || !wallet) {
    return null;
  }

  const modifiedDocument = modifyDocument(document, gasWanted, gasFee);

  if (!withSignTransaction) {
    return documentToDefaultTx(modifiedDocument);
  }

  const { signed } = await transactionService
    .createTransaction(wallet, modifiedDocument)
    .catch(() => {
      return {
        signed: null,
      };
    });
  if (!signed) {
    return documentToDefaultTx(modifiedDocument);
  }

  return signed;
};

export const useGetEstimateGasInfo = (
  document: Document | null | undefined,
  gasUsed: number,
  options?: UseQueryOptions<GasInfo | null, Error>,
): UseQueryResult<GasInfo | null> => {
  const { data: gasPrice } = useGetGasPrice();
  const { wallet } = useWalletContext();
  const { transactionService, transactionGasService } = useAdenaContext();

  async function makeTransaction(document: Document | null | undefined): Promise<Tx | null> {
    if (!document || !gasPrice) {
      return null;
    }

    return makeEstimateGasTransaction(
      wallet,
      transactionService,
      document,
      gasUsed,
      gasPrice,
      true,
    );
  }

  return useQuery<GasInfo | null, Error>({
    queryKey: [
      GET_ESTIMATE_GAS_INFO_KEY,
      transactionGasService,
      document?.msgs || '',
      document?.memo || '',
      gasUsed,
      gasPrice || 0,
    ],
    queryFn: async (): Promise<GasInfo | null> => {
      if (!transactionGasService || !gasPrice) {
        return null;
      }

      const tx = await makeTransaction(document);
      if (!tx) {
        return null;
      }

      const resultGasUsed = await transactionGasService
        .estimateGas(tx)
        .then((gasUsed) => ({
          gasUsed,
          errorMessage: null,
        }))
        .catch(() => null);

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
