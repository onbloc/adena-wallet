import { DEFAULT_GAS_PRICE_RATE } from '@common/constants/gas.constant';
import { DEFAULT_GAS_WANTED } from '@common/constants/tx.constant';
import { parseStorageDeposits } from '@common/provider/gno/utils';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { NetworkFeeSettingInfo, NetworkFeeSettingType } from '@types';
import { Document } from 'adena-module';
import BigNumber from 'bignumber.js';
import { useIsInitializedAccount } from '../use-get-account-info';
import { makeEstimateGasTransaction } from './use-get-estimate-gas-info';
import { useGetGasPrice } from './use-get-gas-price';

const REFETCH_INTERVAL = 5_000;

const DefaultStorageDeposits = {
  storageDeposit: 0,
  unlockDeposit: 0,
  storageUsage: 0,
  releaseStorageUsage: 0,
};

export const GET_ESTIMATE_GAS_PRICE_TIERS = 'transactionGas/getEstimateGasPriceTiers';

export const useGetEstimateGasPriceTiers = (
  document: Document | null | undefined,
  gasUsed: number | undefined,
  gasAdjustment: string,
  options?: UseQueryOptions<NetworkFeeSettingInfo[] | null, Error>,
): UseQueryResult<NetworkFeeSettingInfo[] | null> => {
  const { currentAccount, currentAddress } = useCurrentAccount();
  const { transactionGasService, transactionService } = useAdenaContext();
  const { data: gasPrice } = useGetGasPrice();
  const { wallet } = useWalletContext();
  const isInitializedAccount = useIsInitializedAccount(currentAddress);

  return useQuery<NetworkFeeSettingInfo[] | null, Error>({
    queryKey: [
      wallet,
      currentAccount?.id,
      GET_ESTIMATE_GAS_PRICE_TIERS,
      transactionGasService,
      document?.msgs,
      document?.memo,
      document?.account_number,
      document?.sequence,
      gasUsed,
      gasAdjustment,
      gasPrice || 0,
      isInitializedAccount,
    ],
    queryFn: async (): Promise<NetworkFeeSettingInfo[] | null> => {
      if (
        !transactionService ||
        !transactionGasService ||
        !document ||
        !gasPrice ||
        isInitializedAccount === null
      ) {
        return null;
      }

      return Promise.all(
        Object.keys(NetworkFeeSettingType).map(async (key) => {
          const tier = key as NetworkFeeSettingType;

          const adjustGasUsedBN = BigNumber(gasUsed || DEFAULT_GAS_WANTED)
            .multipliedBy(DEFAULT_GAS_PRICE_RATE[tier])
            .multipliedBy(gasAdjustment);
          const adjustGasUsed = adjustGasUsedBN.toFixed(0, BigNumber.ROUND_DOWN);
          const adjustedGasPriceBN = BigNumber(gasPrice);
          const gasFee = adjustedGasPriceBN
            .multipliedBy(adjustGasUsed)
            .toFixed(0, BigNumber.ROUND_UP);

          const tx = await makeEstimateGasTransaction(
            wallet,
            currentAccount,
            transactionService,
            document,
            Number(adjustGasUsed),
            adjustedGasPriceBN.toNumber(),
            !isInitializedAccount,
          );

          if (!tx) {
            return {
              settingType: tier,
              storageDeposits: DefaultStorageDeposits,
              gasInfo: {
                gasFee: 0,
                gasUsed: Number(adjustGasUsed),
                gasWanted: Number(adjustGasUsed),
                gasPrice: gasPrice,
                hasError: true,
                simulateErrorMessage: 'Failed to simulate transaction',
              },
            };
          }

          const result = await transactionGasService
            .simulateTx(tx)
            .then((simulateResult) => {
              if (simulateResult.gas_used.toNumber() > Number(adjustGasUsed)) {
                return {
                  gasUsed: 0,
                  errorMessage: 'Network fee too low',
                  storageDeposits: DefaultStorageDeposits,
                };
              }

              const storageDeposits = parseStorageDeposits(
                simulateResult.response_base?.events ?? [],
              );

              return {
                gasUsed: Number(adjustGasUsed),
                storageDeposits,
                errorMessage: null,
              };
            })
            .catch((e: Error) => {
              return {
                gasUsed: 0,
                errorMessage: e?.message || '',
                storageDeposits: DefaultStorageDeposits,
              };
            });

          if (result.gasUsed === 0) {
            return {
              settingType: tier,
              storageDeposits: result.storageDeposits,
              gasInfo: {
                gasFee: 0,
                gasUsed: Number(adjustGasUsed),
                gasWanted: Number(adjustGasUsed),
                gasPrice: gasPrice,
                hasError: true,
                simulateErrorMessage: result.errorMessage,
              },
            };
          }

          return {
            settingType: tier,
            storageDeposits: result.storageDeposits,
            gasInfo: {
              gasFee: Number(gasFee),
              gasUsed: Number(adjustGasUsed),
              gasWanted: Number(adjustGasUsed),
              gasPrice: gasPrice,
              hasError: result.errorMessage !== null,
              simulateErrorMessage: result.errorMessage,
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
