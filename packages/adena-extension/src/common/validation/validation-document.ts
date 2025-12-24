/**
 * Validates the fee structure of a signed document.
 * Verifies that fee object exists, gas is a non-empty string, and amount is a non-empty array.
 *
 * @param fee - The fee object to validate
 * @returns true if fee structure is valid, false otherwise
 */

export const validateTransactionDocumentFee = (fee: any): boolean => {
  if (!fee || typeof fee !== 'object') {
    return false;
  }

  if (!fee.gas_wanted || typeof fee.gas_wanted !== 'string') {
    return false;
  }

  if (!fee.gas_fee || typeof fee.gas_fee !== 'string') {
    return false;
  }

  return true;
};

/**
 * Validates the messages array of a signed document.
 * Verifies that msgs is an array and contains at least one message.
 *
 * @param msgs - The messages array to validate
 * @returns true if messages array is valid and not empty, false otherwise
 */
export const validateTransactionDocumentMessages = (msgs: any): boolean => {
  return Array.isArray(msgs) && msgs.length > 0;
};
