/**
 * Validates basic fields of a signed document.
 * Verifies that chain_id, account_number, sequence, and memo are all strings.
 *
 * @param signedDocument - The signed document object to validate
 * @returns true if all basic fields are valid strings, false otherwise
 */
export const validateSignedDocumentFields = (signedDocument: any): boolean => {
  return (
    typeof signedDocument.chain_id === 'string' &&
    typeof signedDocument.account_number === 'string' &&
    typeof signedDocument.sequence === 'string' &&
    typeof signedDocument.memo === 'string'
  );
};

/**
 * Validates the fee structure of a signed document.
 * Verifies that fee object exists, gas is a non-empty string, and amount is a non-empty array.
 *
 * @param fee - The fee object to validate
 * @returns true if fee structure is valid, false otherwise
 */

export const validateSignedDocumentFee = (fee: any): boolean => {
  return (
    fee &&
    typeof fee.gas === 'string' &&
    Array.isArray(fee.amount) &&
    fee.gas.length > 0 &&
    fee.amount.length > 0
  );
};

/**
 * Validates the messages array of a signed document.
 * Verifies that msgs is an array and contains at least one message.
 *
 * @param msgs - The messages array to validate
 * @returns true if messages array is valid and not empty, false otherwise
 */
export const validateSignedDocumentMessages = (msgs: any): boolean => {
  return Array.isArray(msgs) && msgs.length > 0;
};
