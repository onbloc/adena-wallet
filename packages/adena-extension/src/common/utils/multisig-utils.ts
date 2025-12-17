import { SignerPublicKeyInfo } from 'adena-module';
import { Signature } from '@inject/types';

/**
 * Filter valid signatures based on multisig account's signer public keys
 * @param signatures - All collected signatures
 * @param signerPublicKeys - Valid signer public keys from multisig account
 * @returns Valid signatures only
 */
export const filterValidSignatures = (
  signatures: Signature[],
  signerPublicKeys: SignerPublicKeyInfo[],
): Signature[] => {
  if (!signerPublicKeys || signerPublicKeys.length === 0) {
    return [];
  }

  const validPublicKeyValues = new Set(signerPublicKeys.map((signer) => signer.publicKey.value));

  return signatures.filter((signature) => {
    const signaturePubKeyValue = signature.pub_key.value;
    return validPublicKeyValues.has(signaturePubKeyValue);
  });
};
