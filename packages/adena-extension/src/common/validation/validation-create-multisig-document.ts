import { MultisigConfig } from '@inject/types';
import { validateInvalidAddress } from './validation-address-book';

/**
 * Validates multisig config object and its required fields
 */
export const validateMultisigConfigExists = (
  multisigConfig: MultisigConfig | undefined,
): boolean => {
  if (!multisigConfig) {
    return false;
  }

  return (
    'signers' in multisigConfig &&
    'threshold' in multisigConfig &&
    multisigConfig.signers !== undefined &&
    multisigConfig.threshold !== undefined
  );
};

/**
 * Validates signers array format and minimum count
 */
export const validateMultisigSigners = (signers: any): boolean => {
  return Array.isArray(signers) && signers.length >= 2;
};

/**
 * Validates all signer addresses
 */
export const validateMultisigSignerAddresses = (signers: string[]): boolean => {
  try {
    for (const signer of signers) {
      validateInvalidAddress(signer);
    }
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Validates threshold value
 */
export const validateMultisigThreshold = (threshold: any, signersCount: number): boolean => {
  if (typeof threshold !== 'number' || threshold <= 0) {
    return false;
  }

  if (signersCount <= 0) {
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
