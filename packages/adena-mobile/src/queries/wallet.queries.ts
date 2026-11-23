import { useQuery, UseQueryResult } from '@tanstack/react-query';

import { useContainer } from '../di/container-provider';
import { BiometryKind } from '../security/secure-store';
import { WalletStatus } from '../services/wallet.service';
import { queryKeys } from './query-keys';

export interface BiometricStatus {
  // null when the device has no enrolled biometrics.
  kind: BiometryKind | null;
  // Biometric unlock has been turned on for this wallet.
  enabled: boolean;
}

export const useWalletStatusQuery = (): UseQueryResult<WalletStatus> => {
  const { walletService } = useContainer();

  return useQuery({
    queryKey: queryKeys.walletStatus(),
    queryFn: () => walletService.getStatus(),
  });
};

export const useBiometricStatusQuery = (): UseQueryResult<BiometricStatus> => {
  const { walletService } = useContainer();

  return useQuery({
    queryKey: queryKeys.biometric(),
    queryFn: async () => {
      const [kind, enabled] = await Promise.all([walletService.getBiometryKind(), walletService.isBiometricUnlockEnabled()]);

      return { kind, enabled };
    },
  });
};
