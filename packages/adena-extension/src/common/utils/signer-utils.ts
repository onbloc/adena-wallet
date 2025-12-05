import { EncodeTxSignature } from '@services/index';
import { publicKeyToAddress } from 'adena-module';

/**
 * Extract the signer addresses from the Signature array.
 * @param signatures - Signature array
 * @returns
 */
export const extractSignerAddresses = async (
  signatures: EncodeTxSignature[],
): Promise<string[]> => {
  if (!signatures || signatures.length === 0) {
    return [];
  }

  try {
    const addresses = await Promise.all(
      signatures.map(async (signature) => {
        if (!signature?.pubKey?.value) {
          return '';
        }

        try {
          const fullBytes = Uint8Array.from(atob(signature.pubKey.value), (c) => c.charCodeAt(0));
          const pubKeyBytes = fullBytes.slice(2);
          const address = await publicKeyToAddress(pubKeyBytes);
          return address;
        } catch (e) {
          console.error('Failed to extract address from signature:', e);
          return '';
        }
      }),
    );

    return addresses.filter((addr) => addr !== '');
  } catch (e) {
    console.error('Failed to extract signer addresses:', e);
    return [];
  }
};

/**
 * Converts a Signature array into a serializable key string.
 * A helper function for use as a queryKey in React Query.
 * @param signatures - Signature array
 * @returns
 */
export const serializeSignaturesKey = (signatures?: EncodeTxSignature[]): string => {
  return signatures?.map((sig) => sig.pubKey?.value).join(',') || '';
};
