import { GasToken } from '@common/constants/token.constant';
import {
  checkFeeSufficiency,
  FeeShortfall,
  getFeeShortfallFromSimulateError,
  sumSpentGnotAmount,
} from '@common/utils/fee-sufficiency';
import { Document } from 'adena-module';
import { useMemo } from 'react';

import { UseNetworkFeeReturn } from './use-network-fee';

export interface UseFeeSufficiencyReturn {
  isErrorNetworkFee: boolean;
  isErrorStorageDeposit: boolean;
  /** Set when the simulate failed because the balance couldn't cover a fee. */
  simulateFeeShortfall: FeeShortfall | null;
}

/**
 * Whether the GNOT balance covers the network fee and storage deposit of the
 * document, on top of the GNOT its messages send.
 */
export const useFeeSufficiency = (
  document: Document | null | undefined,
  balance: number | null | undefined,
  useNetworkFeeReturn: UseNetworkFeeReturn,
): UseFeeSufficiencyReturn => {
  const {
    networkFee,
    currentGasFeeRawAmount,
    currentStorageDeposits,
    isSimulateError,
    currentGasInfo,
  } = useNetworkFeeReturn;
  const simulateErrorMessage = currentGasInfo?.simulateErrorMessage;

  const feeSufficiency = useMemo(() => {
    if (!networkFee) {
      return { isInsufficientNetworkFee: false, isInsufficientStorageDeposit: false };
    }

    return checkFeeSufficiency({
      balance: balance || 0,
      spentAmount: sumSpentGnotAmount(document?.msgs, GasToken.denom),
      networkFee: currentGasFeeRawAmount,
      storageDeposit: currentStorageDeposits?.storageDeposit || 0,
      unlockDeposit: currentStorageDeposits?.unlockDeposit || 0,
    });
  }, [networkFee, balance, document, currentGasFeeRawAmount, currentStorageDeposits]);

  const simulateFeeShortfall = useMemo(() => {
    if (!isSimulateError) {
      return null;
    }

    return getFeeShortfallFromSimulateError(simulateErrorMessage);
  }, [isSimulateError, simulateErrorMessage]);

  return {
    isErrorNetworkFee:
      feeSufficiency.isInsufficientNetworkFee || simulateFeeShortfall === 'networkFee',
    isErrorStorageDeposit:
      feeSufficiency.isInsufficientStorageDeposit || simulateFeeShortfall === 'storageDeposit',
    simulateFeeShortfall,
  };
};
