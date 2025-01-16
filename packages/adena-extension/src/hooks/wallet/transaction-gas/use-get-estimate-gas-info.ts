import {
  DEFAULT_GAS_USED,
  GAS_FEE_SAFETY_MARGIN,
  MINIMUM_GAS_PRICE,
} from '@common/constants/gas.constant';
import { GasToken } from '@common/constants/token.constant';
import { useAdenaContext } from '@hooks/use-context';
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { GasInfo } from '@types';
import { Document, documentToDefaultTx } from 'adena-module';
import BigNumber from 'bignumber.js';

export const GET_ESTIMATE_GAS_INFO_KEY = 'transactionGas/useGetSingleEstimateGas';

const REFETCH_INTERVAL = 5_000;

function makeGasInfoBy(
  gasUsed: number | null | undefined,
  gasPrice: number | null | undefined,
  safetyMargin: number,
): {
  gasWanted: number;
  gasFee: number;
} {
  if (!gasUsed || !gasPrice) {
    return {
      gasWanted: 0,
      gasFee: 0,
    };
  }

  const gasWantedBN = BigNumber(gasUsed).multipliedBy(safetyMargin);
  const gasFeeBN = gasWantedBN.multipliedBy(gasPrice);

  return {
    gasWanted: Number(gasWantedBN.toFixed(0, BigNumber.ROUND_DOWN)),
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
  const emptyMargin = 1;

  return useGetEstimateGasInfo(document, DEFAULT_GAS_USED, MINIMUM_GAS_PRICE, emptyMargin, options);
};

export const useGetEstimateGasInfo = (
  document: Document | null | undefined,
  gasUsed: number,
  gasPrice: number,
  safetyMargin: number = GAS_FEE_SAFETY_MARGIN,
  options?: UseQueryOptions<GasInfo | null, Error>,
): UseQueryResult<GasInfo | null> => {
  const { transactionGasService } = useAdenaContext();

  const { gasFee, gasWanted } = makeGasInfoBy(gasUsed, gasPrice, safetyMargin);

  return useQuery<GasInfo | null, Error>({
    queryKey: [GET_ESTIMATE_GAS_INFO_KEY, document?.msgs, document?.memo, gasFee, gasWanted],
    queryFn: async () => {
      if (!document || !gasFee || !gasWanted) {
        return null;
      }

      const modifiedDocument = modifyDocument(document, gasWanted, gasFee);

      const result = await transactionGasService
        .estimateGas(documentToDefaultTx(modifiedDocument))
        .catch((e: Error) => {
          if (e.message === '/std.InvalidPubKeyError') {
            return DEFAULT_GAS_USED;
          }

          return null;
        });

      if (!result) {
        return {
          gasFee,
          gasUsed,
          gasWanted,
          gasPrice: 0,
          hasError: true,
        };
      }

      return {
        gasFee: gasFee,
        gasUsed: result,
        gasWanted: gasWanted,
        gasPrice: gasPrice,
      };
    },
    refetchInterval: REFETCH_INTERVAL,
    keepPreviousData: true,
    enabled: !!document && !!gasFee && !!gasWanted,
    ...options,
  });
};
