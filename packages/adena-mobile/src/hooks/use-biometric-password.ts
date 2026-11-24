import { useCallback } from 'react';

import { IconName } from '../components/atoms';
import { toErrorMessage } from '../core/error-message';
import { AppErrorCode, isAppError } from '../core/errors';
import { useContainer } from '../di/container-provider';
import { useBiometricStatusQuery } from '../queries/wallet.queries';
import { BiometryKind, SecurePrompt } from '../security/secure-store';
import { getBiometryLabel } from '../utils/biometry';

export interface BiometricOption {
  label: string;
  icon: IconName;
}

// `message` is undefined for a plain cancel: the password field takes over silently.
export type BiometricPasswordResult = { ok: true; password: string } | { ok: false; message?: string };

export interface UseBiometricPasswordReturn {
  // False until the biometric status is known, so a gate does not decide too early.
  ready: boolean;
  // Set only when biometric unlock is enabled for this wallet.
  option?: BiometricOption;
  read: (prompt: SecurePrompt) => Promise<BiometricPasswordResult>;
}

export const describeBiometricFailure = (error: unknown, label = 'Biometrics'): string | undefined => {
  if (isAppError(error, AppErrorCode.BIOMETRICS_CANCELED)) {
    return undefined;
  }

  // A stale escrowed password (changed since biometrics were enabled) needs the typed one.
  if (isAppError(error, AppErrorCode.INVALID_PASSWORD)) {
    return 'Biometric password is out of date. Enter your password.';
  }

  // Lockout, an invalidated key or a removed enrollment.
  if (isAppError(error, AppErrorCode.BIOMETRICS_UNAVAILABLE)) {
    return `${label} is unavailable. Enter your password.`;
  }

  return toErrorMessage(error);
};

// The wallet password released by biometrics, through the same service path as biometric unlock.
export const useBiometricPassword = (): UseBiometricPasswordReturn => {
  const { walletService } = useContainer();
  const status = useBiometricStatusQuery();
  const label = status.data?.enabled ? getBiometryLabel(status.data.kind) : undefined;
  const option: BiometricOption | undefined = label
    ? { label, icon: status.data?.kind === BiometryKind.FINGERPRINT ? 'fingerprint' : 'faceId' }
    : undefined;

  const read = useCallback(async (prompt: SecurePrompt): Promise<BiometricPasswordResult> => {
    try {
      return { ok: true, password: await walletService.readBiometricPassword(prompt) };
    }
    catch (error) {
      return { ok: false, message: describeBiometricFailure(error, label) };
    }
  }, [label, walletService]);

  return { ready: !status.isPending, option, read };
};
