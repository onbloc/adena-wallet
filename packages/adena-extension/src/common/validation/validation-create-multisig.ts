import { parseTokenAmount } from '@common/utils/amount-utils';
import { validateAddress } from 'adena-module';

/**
 * Validates signers array format and minimum count
 */
export const validateMultisigSigners = (signers: any): boolean => {
  return (
    Array.isArray(signers) &&
    signers.length >= 2 &&
    signers.every((signer) => typeof signer === 'string' && validateAddress(signer))
  );
};

/**
 * Validates threshold value
 */
export const validateMultisigThreshold = (threshold: any, signersCount: number): boolean => {
  if (typeof threshold !== 'number' || !Number.isInteger(threshold)) {
    return false;
  }

  if (signersCount < 2) {
    return false;
  }

  if (threshold < 1) {
    return false;
  }

  if (threshold > signersCount) {
    return false;
  }

  return true;
};

/**
 * Validates chain_id field
 */
export const validateChainId = (chain_id: any): boolean => {
  return typeof chain_id === 'string' && chain_id.length > 0;
};

/**
 * Validatres fee field
 */
export const validateFee = (fee: any): boolean => {
  if (!fee || typeof fee !== 'object') {
    return false;
  }

  if (!fee.gasFee || typeof fee.gasFee !== 'string') {
    return false;
  }

  if (!fee.gasWanted || typeof fee.gasWanted !== 'string') {
    return false;
  }

  const amount = parseTokenAmount(fee.gasFee);
  if (amount === 0) {
    return false;
  }

  return true;
};
