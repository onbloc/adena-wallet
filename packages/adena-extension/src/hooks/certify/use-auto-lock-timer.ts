import { useCallback, useEffect, useState } from 'react';

import {
  DEFAULT_AUTO_LOCK_TIMEOUT_MINUTES,
  MAX_AUTO_LOCK_TIMEOUT_MINUTES,
} from '@repositories/wallet';
import useAppNavigate from '@hooks/use-app-navigate';
import { useAdenaContext } from '@hooks/use-context';

export type UseAutoLockTimerReturn = {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  errorMessage: string;
  isLoading: boolean;
  saveDisabled: boolean;
  onSave: () => Promise<void>;
  onCancel: () => void;
};

const RANGE_ERROR_MESSAGE = `Please set a time between 0 ~ ${MAX_AUTO_LOCK_TIMEOUT_MINUTES} minutes (a day).`;

const validate = (raw: string): { minutes: number | null; errorMessage: string } => {
  const trimmed = raw.trim();
  // Empty / non-digit inputs are rejected at the input layer, but guard here
  // anyway — the input filter is the UX, this is the safety net.
  if (trimmed === '' || !/^\d+$/.test(trimmed)) {
    return { minutes: null, errorMessage: RANGE_ERROR_MESSAGE };
  }
  const minutes = Number(trimmed);
  if (!Number.isFinite(minutes) || minutes < 0 || minutes > MAX_AUTO_LOCK_TIMEOUT_MINUTES) {
    return { minutes: null, errorMessage: RANGE_ERROR_MESSAGE };
  }
  return { minutes, errorMessage: '' };
};

export const useAutoLockTimer = (): UseAutoLockTimerReturn => {
  const { walletService } = useAdenaContext();
  const { goBack } = useAppNavigate();

  const [value, setValue] = useState<string>(`${DEFAULT_AUTO_LOCK_TIMEOUT_MINUTES}`);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    walletService
      .getAutoLockTimeoutMinutes()
      .then((minutes) => {
        if (!cancelled) {
          setValue(`${minutes}`);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return (): void => {
      cancelled = true;
    };
  }, [walletService]);

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    // Only accept digit-only strings (or empty for backspacing). Reject any
    // keystroke that introduces "-", ".", "e", letters, etc. so the user
    // cannot enter a non-natural-number in the first place.
    if (next !== '' && !/^\d+$/.test(next)) {
      return;
    }
    setValue(next);
    setErrorMessage('');
  }, []);

  const onSave = useCallback(async () => {
    const { minutes, errorMessage: validationError } = validate(value);
    if (minutes === null) {
      setErrorMessage(validationError);
      return;
    }
    await walletService.updateAutoLockTimeoutMinutes(minutes);
    goBack();
  }, [value, walletService, goBack]);

  const { errorMessage: previewError } = validate(value);
  const saveDisabled = isLoading || previewError !== '';

  return {
    value,
    onChange,
    errorMessage,
    isLoading,
    saveDisabled,
    onSave,
    onCancel: goBack,
  };
};
