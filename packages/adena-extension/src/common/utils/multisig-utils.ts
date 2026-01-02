import { SignerPublicKeyInfo } from 'adena-module';
import { Signature, SignerInfo, SignerStatusType } from '@inject/types';

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

  if (!signatures || signatures.length === 0) {
    return [];
  }

  const validPublicKeyValues = new Set(
    signerPublicKeys
      .filter((signer) => signer?.publicKey?.value)
      .map((signer) => signer.publicKey.value),
  );

  return signatures.filter((signature) => {
    const signaturePubKeyValue = signature?.pub_key?.value;
    return signaturePubKeyValue && validPublicKeyValues.has(signaturePubKeyValue);
  });
};

/**
 * Create signer info list with signature status
 * @param signerPublicKeys - Multisig account's signer public keys
 * @param signatures - Collected signatures
 * @returns Signer info array with status
 */
export const createMultisigSignerInfoList = (
  signerPublicKeys: SignerPublicKeyInfo[],
  signatures: Signature[],
): SignerInfo[] => {
  if (!signerPublicKeys || signerPublicKeys.length === 0) {
    return [];
  }

  const signedPublicKeys = new Set(
    (signatures || [])
      .filter((signature) => signature?.pub_key?.value)
      .map((signature) => signature.pub_key.value),
  );

  return signerPublicKeys.map((signer) => ({
    address: signer.address,
    publicKey: signer.publicKey.value,
    status: signedPublicKeys.has(signer.publicKey.value)
      ? SignerStatusType.SIGNED
      : SignerStatusType.UNSIGNED,
  }));
};
