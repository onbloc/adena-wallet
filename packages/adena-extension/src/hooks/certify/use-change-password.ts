import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PasswordValidationError } from '@common/errors';
import { useAdenaContext } from '@hooks/use-context';
import {
  validateEqualsChangePassword,
  validateInvalidPassword,
  validateNotMatchConfirmPassword,
  validatePasswordComplexity,
} from '@common/validation';
import useAppNavigate from '@hooks/use-app-navigate';
import { evaluatePassword, EvaluatePasswordResult } from '@common/utils/password-utils';

export type UseChangePasswordReturn = {
  currPwdState: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error: boolean;
    ref: React.RefObject<HTMLInputElement>;
  };
  newPwdState: {
    value: string;
    evaluationResult: EvaluatePasswordResult | null;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error: boolean;
  };
  confirmPwdState: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error: boolean;
  };
  errorMessage: string;
  buttonState: {
    onClick: {
      cancel: () => void;
      save: () => void;
    };
    disabled: boolean;
  };
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
};

export const useChangePassword = (): UseChangePasswordReturn => {
  const { walletService } = useAdenaContext();
  const { goBack } = useAppNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [inputs, setInputs] = useState({
    currPwd: '',
    newPwd: '',
    confirmPwd: '',
  });
  const { currPwd, newPwd, confirmPwd } = inputs;

  const [isCurrPwdError, setIsCurrPwdError] = useState(false);
  const [isNewPwdError, setIsNewPwdError] = useState(false);
  const [isConfirmPwdError, setIsConfirmPwdError] = useState(false);
  const [savedPassword, setSavedPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const newPasswordEvaluationResult = useMemo(() => {
    if (newPwd.length > 0) {
      return evaluatePassword(newPwd);
    }
    return null;
  }, [newPwd]);

  useEffect(() => {
    initSavedPassword();
  }, []);

  useEffect(() => {
    setIsCurrPwdError(false);
    setIsNewPwdError(false);
    setIsConfirmPwdError(false);
    setErrorMessage('');
  }, [currPwd, newPwd, confirmPwd]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  const initSavedPassword = async (): Promise<void> => {
    const currentPassword = await walletService.loadWalletPassword();
    setSavedPassword(currentPassword);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && currPwd && newPwd && confirmPwd) {
      saveButtonClick();
    }
  };

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setInputs((inputs) => ({ ...inputs, [name]: value }));
    },
    [currPwd, newPwd, confirmPwd],
  );

  const validationCheck = async (): Promise<'FINISH' | 'FAIL'> => {
    const storedPassword = savedPassword;
    const currentPassword = currPwd;
    const newPassword = newPwd;
    const newConfirmPassword = confirmPwd;

    let isValid = true;
    let errorMessage = '';
    try {
      validateInvalidPassword(currentPassword, storedPassword);
    } catch (error) {
      isValid = false;
      if (error instanceof PasswordValidationError) {
        setIsCurrPwdError(true);
        if (errorMessage === '') {
          errorMessage = error.message;
        }
      }
    }
    try {
      validatePasswordComplexity(newPassword);
      validateEqualsChangePassword(newPassword, currentPassword);
    } catch (error) {
      isValid = false;
      if (error instanceof PasswordValidationError) {
        setIsNewPwdError(true);
        if (errorMessage === '') {
          errorMessage = error.message;
        }
      }
    }
    try {
      validateNotMatchConfirmPassword(newPassword, newConfirmPassword);
    } catch (error) {
      isValid = false;
      if (error instanceof PasswordValidationError) {
        setIsConfirmPwdError(true);
        if (errorMessage === '') {
          errorMessage = error.message;
        }
      }
    }

    setErrorMessage(errorMessage);
    if (isValid) {
      try {
        await walletService.changePassword(newPassword);
        return 'FINISH';
      } catch (e) {
        console.error(e);
      }
    }
    return 'FAIL';
  };

  const saveButtonClick = async (): Promise<void> => {
    const state = await validationCheck();
    if (state === 'FINISH') {
      return goBack();
    }
  };

  return {
    currPwdState: {
      value: currPwd,
      onChange: onChange,
      error: isCurrPwdError,
      ref: inputRef,
    },
    newPwdState: {
      value: newPwd,
      evaluationResult: newPasswordEvaluationResult,
      onChange: onChange,
      error: isNewPwdError,
    },
    confirmPwdState: {
      value: confirmPwd,
      onChange: onChange,
      error: isConfirmPwdError,
    },
    errorMessage: errorMessage,
    buttonState: {
      onClick: {
        cancel: goBack,
        save: saveButtonClick,
      },
      disabled: Object.values(inputs).some((el) => el === ''),
    },
    onKeyDown,
  };
};
