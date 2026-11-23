import { useCallback, useState } from 'react';

import { toErrorMessage } from '../core/error-message';
import { AppErrorCode, isAppError } from '../core/errors';

// State for a password-gated action rendered through PasswordSheet.
export interface UsePasswordGateReturn {
  open: () => void;
  sheetProps: {
    visible: boolean;
    password: string;
    onChangePassword: (value: string) => void;
    error: string | undefined;
    submitting: boolean;
    onConfirm: () => Promise<void>;
    onClose: () => void;
  };
}

export const usePasswordGate = (action: (password: string) => Promise<void>): UsePasswordGateReturn => {
  const [visible, setVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const close = useCallback(() => {
    setVisible(false);
    setPassword('');
    setError(undefined);
  }, []);

  const confirm = useCallback(async () => {
    if (!password || submitting) {
      return;
    }

    setSubmitting(true);

    try {
      await action(password);
      close();
    }
    catch (actionError) {
      setError(isAppError(actionError, AppErrorCode.INVALID_PASSWORD) ? 'Incorrect password.' : toErrorMessage(actionError));
    }
    finally {
      setSubmitting(false);
    }
  }, [action, close, password, submitting]);

  return {
    open: (): void => setVisible(true),
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
    },
  };
};
