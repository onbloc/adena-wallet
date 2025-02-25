import { DEFAULT_GAS_USED, GAS_FEE_SAFETY_MARGIN } from '@common/constants/gas.constant';
import { GasToken } from '@common/constants/token.constant';
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

export const useGetEstimateGasPriceTiers = (
  document: Document | null | undefined,
  gasUsed: number | undefined,
  gasAdjustment: string,
  options?: UseQueryOptions<NetworkFeeSettingInfo[] | null, Error>,
): UseQueryResult<NetworkFeeSettingInfo[] | null> => {
  const { transactionGasService } = useAdenaContext();
  const { data: gasPriceTier } = useGetGasPriceTier(GasToken.denom);

  const priceTierKey = gasPriceTier ? Object.keys(gasPriceTier).join(',') : '';

  return useQuery<NetworkFeeSettingInfo[] | null, Error>({
    queryKey: [
      GET_ESTIMATE_GAS_PRICE_TIERS,
      document?.msgs,
      document?.memo,
      gasUsed,
      gasAdjustment,
      priceTierKey,
    ],
    queryFn: async (): Promise<NetworkFeeSettingInfo[] | null> => {
      if (!document || gasUsed === undefined || !gasPriceTier) {
        return null;
      }

      return Promise.all(
        Object.keys(gasPriceTier).map(async (key) => {
          const tier = key as NetworkFeeSettingType;
          const gasPrice = gasPriceTier[tier];

          const adjustedGasPrice = BigNumber(gasPrice).multipliedBy(gasAdjustment).toNumber();

          const { gasWanted, gasFee } = makeGasInfoBy(
            gasUsed || 0,
            adjustedGasPrice,
            GAS_FEE_SAFETY_MARGIN,
          );
          const modifiedDocument = modifyDocument(document, gasWanted, gasFee);

          const result = await transactionGasService
            .estimateGas(documentToDefaultTx(modifiedDocument))
            .catch((e: Error) => {
              if (e?.message === '/std.InvalidPubKeyError') {
                return DEFAULT_GAS_USED;
              }

              return null;
            });

          if (!result || !gasUsed) {
            return {
              settingType: tier,
              gasInfo: {
                gasFee: 0,
                gasUsed: 0,
                gasWanted: 0,
                gasPrice: 0,
                hasError: true,
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
    enabled: !!document && !!gasPriceTier,
    ...options,
  });
};
