import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PasswordValidationError } from '@common/errors';
import { useAdenaContext } from '@hooks/use-context';
import {
  validateEqualsChangePassword,
  validateInvalidPassword,
  validateNotMatchConfirmPassword,
  validateWrongPasswordLength,
} from '@common/validation';

export type UseChangePasswordReturn = {
  currPwdState: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error: boolean;
    ref: React.RefObject<HTMLInputElement>;
  };
  newPwdState: {
    value: string;
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
  const navigate = useNavigate();
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
      validateWrongPasswordLength(newPassword);
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
  const cancelButtonClick = (): void => navigate(-1);

  const saveButtonClick = async (): Promise<void> => {
    const state = await validationCheck();
    if (state === 'FINISH') {
      return navigate(-1);
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
        cancel: cancelButtonClick,
        save: saveButtonClick,
      },
      disabled: Object.values(inputs).some((el) => el === ''),
    },
    onKeyDown,
  };
};
