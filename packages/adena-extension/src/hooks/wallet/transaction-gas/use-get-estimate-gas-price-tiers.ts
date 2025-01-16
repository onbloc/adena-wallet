import {
  DEFAULT_GAS_PRICE_STEP,
  DEFAULT_GAS_USED,
  GAS_FEE_SAFETY_MARGIN,
} from '@common/constants/gas.constant';
import { GasToken } from '@common/constants/token.constant';
import { useAdenaContext } from '@hooks/use-context';
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { NetworkFeeSettingInfo, NetworkFeeSettingType } from '@types';
import { Document, documentToDefaultTx } from 'adena-module';
import BigNumber from 'bignumber.js';

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

export const defaultGasPriceTiers: NetworkFeeSettingInfo[] = Object.keys(
  DEFAULT_GAS_PRICE_STEP,
).map((key) => {
  const tier = key as NetworkFeeSettingType;
  const gasPrice = DEFAULT_GAS_PRICE_STEP[tier];

  return {
    settingType: tier,
    gasInfo: {
      gasFee: 0,
      gasUsed: 0,
      gasWanted: 0,
      gasPrice: gasPrice,
    },
  };
});

export const useGetEstimateGasPriceTiers = (
  document: Document | null | undefined,
  gasUsed: number,
  gasAdjustment: string,
  options?: UseQueryOptions<NetworkFeeSettingInfo[], Error>,
): UseQueryResult<NetworkFeeSettingInfo[]> => {
  const { transactionGasService } = useAdenaContext();

  return useQuery<NetworkFeeSettingInfo[], Error>({
    queryKey: [
      GET_ESTIMATE_GAS_PRICE_TIERS,
      document?.msgs,
      document?.memo,
      gasUsed,
      gasAdjustment,
    ],
    queryFn: async (): Promise<NetworkFeeSettingInfo[]> => {
      if (!document || !gasUsed) {
        return defaultGasPriceTiers;
      }

      return Promise.all(
        Object.keys(DEFAULT_GAS_PRICE_STEP).map(async (key) => {
          const tier = key as NetworkFeeSettingType;
          const gasPrice = DEFAULT_GAS_PRICE_STEP[tier];

          const adjustedGasPrice = BigNumber(gasPrice).multipliedBy(gasAdjustment).toNumber();

          const { gasWanted, gasFee } = makeGasInfoBy(
            gasUsed,
            adjustedGasPrice,
            GAS_FEE_SAFETY_MARGIN,
          );
          const modifiedDocument = modifyDocument(document, gasWanted, gasFee);

          const result = await transactionGasService
            .estimateGas(documentToDefaultTx(modifiedDocument))
            .catch((e: Error) => {
              console.log('e', e);
              if (e.message === '/std.InvalidPubKeyError') {
                return DEFAULT_GAS_USED;
              }

              return null;
            });

          if (!result) {
            return {
              settingType: tier,
              gasInfo: {
                gasFee: gasFee,
                gasUsed: gasUsed,
                gasWanted: gasWanted,
                gasPrice: adjustedGasPrice,
              },
            };
          }

          const { gasWanted: resultGasWanted, gasFee: resultGasFee } = makeGasInfoBy(
            result,
            adjustedGasPrice,
            GAS_FEE_SAFETY_MARGIN,
          );

          return {
            settingType: tier,
            gasInfo: {
              gasFee: resultGasFee,
              gasUsed: result,
              gasWanted: resultGasWanted,
              gasPrice: adjustedGasPrice,
            },
          };
        }),
      );
    },
    refetchInterval: REFETCH_INTERVAL,
    keepPreviousData: true,
    enabled: !!document,
    ...options,
  });
};
