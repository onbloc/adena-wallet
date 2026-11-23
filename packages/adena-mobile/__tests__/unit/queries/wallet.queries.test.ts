import { renderHook, waitFor } from '@testing-library/react-native';

import { useBiometricStatusQuery, useWalletStatusQuery } from '../../../src/queries/wallet.queries';
import { BiometryKind } from '../../../src/security/secure-store';
import { WalletStatus } from '../../../src/services/wallet.service';
import { createWrapper } from '../../helpers/query-wrapper';

describe('useWalletStatusQuery', () => {
  it('reads the wallet status', async () => {
    const walletService = { getStatus: jest.fn().mockResolvedValue(WalletStatus.LOCKED) };
    const { Wrapper } = createWrapper({ walletService });
    const { result } = await renderHook(() => useWalletStatusQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data).toBe('locked'));
  });
});

describe('useBiometricStatusQuery', () => {
  it('combines the biometry kind and the enabled flag', async () => {
    const walletService = { getBiometryKind: jest.fn().mockResolvedValue(BiometryKind.FACE), isBiometricUnlockEnabled: jest.fn().mockResolvedValue(true) };
    const { Wrapper } = createWrapper({ walletService });
    const { result } = await renderHook(() => useBiometricStatusQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data).toEqual({ kind: 'face', enabled: true }));
  });

  it('reports devices without biometrics', async () => {
    const walletService = { getBiometryKind: jest.fn().mockResolvedValue(null), isBiometricUnlockEnabled: jest.fn().mockResolvedValue(false) };
    const { Wrapper } = createWrapper({ walletService });
    const { result } = await renderHook(() => useBiometricStatusQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.data).toEqual({ kind: null, enabled: false }));
  });

  it('fails when a lookup fails', async () => {
    const walletService = { getBiometryKind: jest.fn().mockRejectedValue(new Error('nope')), isBiometricUnlockEnabled: jest.fn().mockResolvedValue(true) };
    const { Wrapper } = createWrapper({ walletService });
    const { result } = await renderHook(() => useBiometricStatusQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('without a container', () => {
  it('throws outside ContainerProvider', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(renderHook(() => useWalletStatusQuery())).rejects.toThrow('useContainer must be used inside ContainerProvider');
  });
});
