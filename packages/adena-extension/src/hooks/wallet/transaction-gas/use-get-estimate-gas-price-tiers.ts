import { DEFAULT_GAS_PRICE_RATE, GAS_FEE_SAFETY_MARGIN } from '@common/constants/gas.constant';
import { GasToken } from '@common/constants/token.constant';
import { INVALID_PUBLIC_KEY_ERROR_TYPE } from '@common/constants/tx-error.constant';
import { DEFAULT_GAS_WANTED } from '@common/constants/tx.constant';
import { useAdenaContext } from '@hooks/use-context';
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { NetworkFeeSettingInfo, NetworkFeeSettingType } from '@types';
import { Document, documentToDefaultTx } from 'adena-module';
import BigNumber from 'bignumber.js';
import { useGetGasPrice } from './use-get-gas-price';

export const GET_ESTIMATE_GAS_PRICE_TIERS = 'transactionGas/getEstimateGasPriceTiers';

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
  const gasFeeBN = BigNumber(gasUsed).multipliedBy(gasPrice);

  return {
    gasWanted: Number(gasWantedBN.toFixed(0, BigNumber.ROUND_DOWN)),
    gasFee: Number(gasFeeBN.toFixed(0, BigNumber.ROUND_UP)),
  };
}

function makeDefaultGasInfoBy(
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

export const useGetEstimateGasPriceTiers = (
  document: Document | null | undefined,
  gasUsed: number | undefined,
  gasAdjustment: string,
  isSuccessSimulate = true,
  options?: UseQueryOptions<NetworkFeeSettingInfo[] | null, Error>,
): UseQueryResult<NetworkFeeSettingInfo[] | null> => {
  const { transactionGasService } = useAdenaContext();
  const { data: gasPrice } = useGetGasPrice();

  return useQuery<NetworkFeeSettingInfo[] | null, Error>({
    queryKey: [
      GET_ESTIMATE_GAS_PRICE_TIERS,
      transactionGasService,
      document?.msgs,
      document?.memo,
      gasUsed,
      gasAdjustment,
      gasPrice || 0,
    ],
    queryFn: async (): Promise<NetworkFeeSettingInfo[] | null> => {
      if (!transactionGasService || !document || gasUsed === undefined || !gasPrice) {
        return null;
      }

      return Promise.all(
        Object.keys(NetworkFeeSettingType).map(async (key) => {
          const tier = key as NetworkFeeSettingType;

          const adjustedGasPriceBN = BigNumber(gasPrice)
            .multipliedBy(DEFAULT_GAS_PRICE_RATE[tier])
            .multipliedBy(gasAdjustment);
          const adjustedGasPrice = adjustedGasPriceBN.toNumber();

          const { gasWanted: resultGasWanted, gasFee: resultGasFee } = isSuccessSimulate
            ? makeGasInfoBy(gasUsed, adjustedGasPrice, GAS_FEE_SAFETY_MARGIN)
            : makeDefaultGasInfoBy(gasUsed, adjustedGasPrice);

          const modifiedDocument = modifyDocument(document, resultGasWanted, resultGasFee);

          const errorMessage = await transactionGasService
            .simulateTx(documentToDefaultTx(modifiedDocument))
            .then(() => null)
            .catch((e: Error) => {
              if (e?.message === INVALID_PUBLIC_KEY_ERROR_TYPE) {
                return null;
              }

              return e?.message || '';
            });

          return {
            settingType: tier,
            gasInfo: {
              gasFee: resultGasFee,
              gasUsed,
              gasWanted: resultGasWanted,
              gasPrice: adjustedGasPrice,
              hasError: errorMessage !== null,
              simulateErrorMessage: errorMessage,
            },
          };
        }),
      );
    },
    refetchInterval: REFETCH_INTERVAL,
    keepPreviousData: true,
    enabled: !!transactionGasService && !!document && !!gasPrice,
    ...options,
  });
};
