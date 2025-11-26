/**
 * Validates a single signature object structure.
 * Verifies the existence and format of pubKey (typeUrl, value) and signature fields.
 *
 * @param signature - The signature object to validate
 * @returns true if signature structure is valid, false otherwise
 */
export const validateSignature = (signature: any): boolean => {
  if (!signature || typeof signature !== 'object') {
    return false;
  }

  if (
    !signature.pubKey ||
    typeof signature.pubKey.typeUrl !== 'string' ||
    typeof signature.pubKey.value !== 'string'
  ) {
    return false;
  }

  if (typeof signature.signature !== 'string') {
    return false;
  }

  return true;
};

/**
 * Validates an array of signature objects.
 * Checks that all signatures in the array have valid structure.
 *
 * @param signatures - Array of signature objects to validate
 * @returns true if all signatures are valid, false if any signature is invalid
 */
export const validateSignatures = (signatures: any[]): boolean => {
  return signatures.every((signature) => validateSignature(signature));
};
