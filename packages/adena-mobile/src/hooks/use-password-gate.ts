import { useCallback, useEffect, useRef, useState } from 'react';

import { PasswordSheetProps } from '../components/molecules';
import { toErrorMessage } from '../core/error-message';
import { AppErrorCode, isAppError } from '../core/errors';
import { SecurePrompt } from '../security/secure-store';
import { useBiometricPassword } from './use-biometric-password';

export type PasswordGateSheetProps = Omit<PasswordSheetProps, 'title' | 'description' | 'confirmLabel' | 'onConfirm'> & { onConfirm: () => Promise<void> };

// State for a password-gated action rendered through PasswordSheet.
export interface UsePasswordGateReturn {
  open: () => void;
  sheetProps: PasswordGateSheetProps;
}

export interface PasswordGateOptions {
  // Shown by the system biometric prompt.
  prompt?: SecurePrompt;
  // Off for passwords that are not the wallet password.
  biometrics?: boolean;
}

// Biometrics first: each open prompts once when biometric unlock is enabled, and a cancel or failure
// falls back to the focused password field. Both paths run the same action with the wallet password.
const DEFAULT_PROMPT: SecurePrompt = { title: 'Confirm with biometrics', cancel: 'Use password' };

export const usePasswordGate = (
  action: (password: string) => Promise<void>,
  { prompt = DEFAULT_PROMPT, biometrics = true }: PasswordGateOptions = {},
): UsePasswordGateReturn => {
  const biometric = useBiometricPassword();
  const option = biometrics ? biometric.option : undefined;
  const [visible, setVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);
  // Render state lags a second call made before React commits; the ref does not.
  const inFlightRef = useRef(false);
  // Bumped on every open and close, so a result landing after the sheet closed is dropped.
  const sessionRef = useRef(0);
  const autoPromptedRef = useRef(false);
  const latestRef = useRef({ action, prompt, read: biometric.read });

  useEffect(() => {
    latestRef.current = { action, prompt, read: biometric.read };
  });

  const requestFocus = (): void => setFocusRequest(value => value + 1);

  const close = useCallback(() => {
    sessionRef.current += 1;
    setVisible(false);
    setPassword('');
    setError(undefined);
  }, []);

  const runAction = useCallback(async (value: string): Promise<void> => {
    const session = sessionRef.current;

    try {
      await latestRef.current.action(value);

      if (session === sessionRef.current) {
        close();
      }
    }
    catch (actionError) {
      if (session !== sessionRef.current) {
        return;
      }

      setError(isAppError(actionError, AppErrorCode.INVALID_PASSWORD) ? 'Incorrect password.' : toErrorMessage(actionError));
      // The field was disabled while checking, which can drop the keyboard.
      requestFocus();
    }
  }, [close]);

  const confirm = useCallback(async (): Promise<void> => {
    if (!password || inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setSubmitting(true);

    try {
      await runAction(password);
    }
    finally {
      inFlightRef.current = false;
      setSubmitting(false);
    }
  }, [password, runAction]);

  const authenticate = useCallback(async (): Promise<void> => {
    if (inFlightRef.current) {
      return;
    }

    const session = sessionRef.current;

    inFlightRef.current = true;
    setSubmitting(true);
    setError(undefined);

    try {
      const result = await latestRef.current.read(latestRef.current.prompt);

      if (session !== sessionRef.current) {
        return;
      }

      if (!result.ok) {
        setError(result.message);
        requestFocus();
        return;
      }

      await runAction(result.password);
    }
    finally {
      inFlightRef.current = false;
      setSubmitting(false);
    }
  }, [runAction]);

  // Decides once per open, after the biometric status is known: prompt, or focus the field.
  useEffect(() => {
    if (!visible || !biometric.ready || autoPromptedRef.current) {
      return;
    }

    autoPromptedRef.current = true;

    if (option) {
      void authenticate();
    }
    else {
      requestFocus();
    }
  }, [authenticate, biometric.ready, option, visible]);

  const open = useCallback((): void => {
    sessionRef.current += 1;
    autoPromptedRef.current = false;
    setVisible(true);
  }, []);

  return {
    open,
    sheetProps: {
      visible,
      password,
      onChangePassword: (value: string): void => {
        setPassword(value);
        setError(undefined);
      },
      error,
      submitting,
      onConfirm: confirm,
      onClose: close,
      biometric: option && { ...option, onPress: authenticate },
      focusRequest,
    },
  };
};
