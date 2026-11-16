import { useQuery } from '@tanstack/react-query';
import { GRC20TokenModel } from '@types';
import { useAdenaContext } from './use-context';
import { useNetwork } from './use-network';

interface UseGRC20TokenOptions {
  enabled: boolean;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const useGRC20Token = (tokenPath: string, options?: UseGRC20TokenOptions) => {
  const { tokenService } = useAdenaContext();
  const { currentNetwork } = useNetwork();

  const enabled = options?.enabled ?? true;

  return useQuery<GRC20TokenModel | null, Error>({
    queryKey: ['grc20-token', currentNetwork.networkId, tokenPath],
    queryFn: () => tokenService.fetchGRC20Token(tokenPath),
    enabled,
  });
};
