import { DEFAULT_GAS_USED } from '@common/constants/gas.constant';
import { GasToken } from '@common/constants/token.constant';
import { DEFAULT_GAS_WANTED } from '@common/constants/tx.constant';
import { useAdenaContext } from '@hooks/use-context';
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { GasInfo, NetworkFeeSettingType } from '@types';
import { Document, documentToDefaultTx } from 'adena-module';
import BigNumber from 'bignumber.js';
import { useGetGasPriceTier } from './use-get-gas-price';

export const GET_ESTIMATE_GAS_INFO_KEY = 'transactionGas/useGetSingleEstimateGas';

const REFETCH_INTERVAL = 5_000;

function makeGasInfoBy(
  gasUsed: number | null | undefined,
  gasPrice: number | null | undefined,
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

  const gasFeeBN = BigNumber(gasUsed).multipliedBy(gasPrice);

  return {
    gasWanted: DEFAULT_GAS_WANTED,
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
  return useGetEstimateGasInfo(document, DEFAULT_GAS_USED, options);
};

export const useGetEstimateGasInfo = (
  document: Document | null | undefined,
  gasUsed: number,
  options?: UseQueryOptions<GasInfo | null, Error>,
): UseQueryResult<GasInfo | null> => {
  const { transactionGasService } = useAdenaContext();
  const { data: gasPriceTier } = useGetGasPriceTier(GasToken.denom);

  return useQuery<GasInfo | null, Error>({
    queryKey: [
      GET_ESTIMATE_GAS_INFO_KEY,
      transactionGasService,
      document?.msgs || '',
      document?.memo || '',
      gasUsed,
      gasPriceTier?.[NetworkFeeSettingType.AVERAGE] || 0,
    ],
    queryFn: async () => {
      if (!document || !gasPriceTier) {
        return null;
      }

      const gasPrice = gasPriceTier?.[NetworkFeeSettingType.AVERAGE];

      const { gasFee, gasWanted } = makeGasInfoBy(gasUsed, gasPrice);
      if (!transactionGasService || !gasFee || !gasWanted) {
        return null;
      }

      const modifiedDocument = modifyDocument(document, gasWanted, gasFee);

      const result = await transactionGasService
        .estimateGas(documentToDefaultTx(modifiedDocument))
        .then((gasUsed) => ({
          gasUsed,
          errorMessage: null,
        }))
        .catch((e: Error) => {
          if (e?.message === '/std.InvalidPubKeyError') {
            return {
              gasUsed: DEFAULT_GAS_USED,
              errorMessage: null,
            };
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
          simulateErrorMessage: '',
        };
      }

      return {
        gasFee: gasFee,
        gasUsed: result.gasUsed,
        gasWanted: gasWanted,
        gasPrice: gasPrice,
        hasError: result.errorMessage !== null,
        simulateErrorMessage: result.errorMessage,
      };
    },
    refetchInterval: REFETCH_INTERVAL,
    keepPreviousData: true,
    enabled: !!document && !!transactionGasService,
    ...options,
  });
};
