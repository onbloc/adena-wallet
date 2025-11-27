import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Signature } from '@adena-wallet/sdk';
import { extractSignerAddresses, serializeSignaturesKey } from '@common/utils/signer-utils';

export interface UseSignerAddressesReturn {
  signerAddresses: string[];
  isLoading: boolean;
  isFetched: boolean;
  isError: boolean;
  error: Error | null;
}

export const useSignerAddresses = (signatures?: Signature[]): UseSignerAddressesReturn => {
  const signaturesKey = useMemo(() => serializeSignaturesKey(signatures), [signatures]);

  const {
    data: signerAddresses = [],
    isLoading,
    isFetched,
    isError,
    error,
  } = useQuery(['signerAddresses', signaturesKey], () => extractSignerAddresses(signatures || []), {
    enabled: !!signatures && signatures.length > 0,
    staleTime: Infinity,
    cacheTime: 5 * 60 * 1000,
  });

  return {
    signerAddresses,
    isLoading,
    isFetched,
    isError,
    error: error as Error | null,
  };
};
