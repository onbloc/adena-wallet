import BigNumber from 'bignumber.js';
import { GasToken } from '@common/constants/token.constant';

export const convertRawGasAmountToDisplayAmount = (rawAmount: string | number): string => {
  try {
    if (!rawAmount) {
      return '0';
    }

    return BigNumber(rawAmount)
      .shiftedBy(-GasToken.decimals)
      .toFixed(GasToken.decimals)
      .replace(/(\.\d*?)0+$/, '$1')
      .replace(/\.$/, '');
  } catch (e) {
    console.warn('[convertRawGasAmountToDisplayAmount] Failed to convert:', {
      rawAmount,
      error: e,
    });
    return '0';
  }
};
