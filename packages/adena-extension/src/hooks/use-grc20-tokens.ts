import { useQuery } from '@tanstack/react-query';
import { GRC20TokenModel } from '@types';
import { useAdenaContext } from './use-context';
import { useCurrentAccount } from './use-current-account';
import { useNetwork } from './use-network';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const useGRC20Tokens = () => {
  const { tokenService } = useAdenaContext();
  const { currentAddress } = useCurrentAccount();
  const { currentNetwork } = useNetwork();

  return useQuery<GRC20TokenModel[], Error>({
    queryKey: ['grc20-tokens', currentNetwork.networkId],
    queryFn: () => {
      return tokenService.fetchGRC20Tokens();
    },
    keepPreviousData: true,
    enabled: !!currentAddress,
  });
};
