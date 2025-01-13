import { GNOT_TOKEN } from '@common/constants/token.constant';
import { waitForRun } from '@common/utils/timeout-utils';
import { FaucetResponse } from '@repositories/common/response';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAdenaContext } from './use-context';
import { useCurrentAccount } from './use-current-account';
import { useNetwork } from './use-network';

export type UseFaucetReturn = {
  isSupported: boolean;
  isLoading: boolean;
  faucet: () => Promise<{ success: boolean; message: string }>;
};

const FAUCET_AMOUNT = 10_000_000 + GNOT_TOKEN.denom;

const FAUCET_UNEXPECTED_ERROR_MESSAGES = 'Unexpected Errors.';

export const useFaucet = (): UseFaucetReturn => {
  const { currentNetwork } = useNetwork();
  const { currentAddress } = useCurrentAccount();
  const { faucetService } = useAdenaContext();

  const { data: isSupported = false } = useQuery<boolean>(
    ['faucet/isSupported', currentNetwork, faucetService],
    () => faucetService.availFaucet(currentNetwork.chainId),
  );

  const { isLoading, mutate } = useMutation({
    mutationFn: (to: string) =>
      waitForRun<FaucetResponse>(
        () => faucetService.faucet(currentNetwork.chainId, to, FAUCET_AMOUNT),
        1000,
      ),
  });

  const faucet = async (): Promise<{ success: boolean; message: string }> => {
    if (!currentAddress) {
      return {
        success: false,
        message: FAUCET_UNEXPECTED_ERROR_MESSAGES,
      };
    }
    return new Promise((resolve) => {
      mutate(currentAddress, {
        onSuccess: (data) => resolve(data),
        onError: () =>
          resolve({
            success: false,
            message: FAUCET_UNEXPECTED_ERROR_MESSAGES,
          }),
      });
    });
  };

  return {
    isSupported,
    isLoading,
    faucet,
  };
};
