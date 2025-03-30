import {
  DEFAULT_GAS_PRICE_RATE,
  GAS_FEE_SAFETY_MARGIN,
  MINIMUM_GAS_PRICE,
} from '@common/constants/gas.constant';
import { GasToken } from '@common/constants/token.constant';
import { DEFAULT_GAS_WANTED } from '@common/constants/tx.constant';
import { useAdenaContext } from '@hooks/use-context';
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { NetworkFeeSettingInfo, NetworkFeeSettingType } from '@types';
import { Document, documentToDefaultTx } from 'adena-module';
import BigNumber from 'bignumber.js';
import { useGetGasPriceTier } from './use-get-gas-price';

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
  const { data: gasPriceTier, isFetched: isFetchedGasPriceTier } = useGetGasPriceTier(
    GasToken.denom,
  );

  const priceTierKey = gasPriceTier ? Object.keys(gasPriceTier).join(',') : '';

  return useQuery<NetworkFeeSettingInfo[] | null, Error>({
    queryKey: [
      GET_ESTIMATE_GAS_PRICE_TIERS,
      transactionGasService,
      document?.msgs,
      document?.memo,
      gasUsed,
      gasAdjustment,
      priceTierKey,
    ],
    queryFn: async (): Promise<NetworkFeeSettingInfo[] | null> => {
      if (!transactionGasService || !document || gasUsed === undefined || !gasPriceTier) {
        return null;
      }

      return Promise.all(
        Object.keys(gasPriceTier).map(async (key) => {
          const tier = key as NetworkFeeSettingType;
          const gasPrice = gasPriceTier[tier];

          const adjustedGasPriceBN = BigNumber(gasPrice).multipliedBy(gasAdjustment);
          const adjustedGasPrice = adjustedGasPriceBN.isLessThan(MINIMUM_GAS_PRICE)
            ? MINIMUM_GAS_PRICE * DEFAULT_GAS_PRICE_RATE[tier]
            : BigNumber(gasPrice).multipliedBy(gasAdjustment).toNumber();

          const { gasWanted: resultGasWanted, gasFee: resultGasFee } = isSuccessSimulate
            ? makeGasInfoBy(gasUsed, adjustedGasPrice, GAS_FEE_SAFETY_MARGIN)
            : makeDefaultGasInfoBy(gasUsed, adjustedGasPrice);

          const modifiedDocument = modifyDocument(document, resultGasWanted, resultGasFee);

          const isSuccess = await transactionGasService
            .simulateTx(documentToDefaultTx(modifiedDocument))
            .then(() => true)
            .catch((e: Error) => {
              if (e?.message === '/std.InvalidPubKeyError') {
                return true;
              }

              return false;
            });

          return {
            settingType: tier,
            gasInfo: {
              gasFee: resultGasFee,
              gasUsed,
              gasWanted: resultGasWanted,
              gasPrice: adjustedGasPrice,
              hasError: !isSuccess,
            },
          };
        }),
      );
    },
    refetchInterval: REFETCH_INTERVAL,
    keepPreviousData: true,
    enabled: !!transactionGasService && !!document && isFetchedGasPriceTier,
    ...options,
  });
};
