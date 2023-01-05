import { RoutePath } from '@router/path';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ValidationService, WalletService } from '@services/index';
import { useWallet } from '@hooks/use-wallet';
import { PasswordValidationError } from '@common/errors';
import { useWalletCreator } from '@hooks/use-wallet-creator';

export const useChangePassword = () => {
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
  const [wallet] = useWallet();
  const [, createWallet] = useWalletCreator();

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

  const initSavedPassword = async () => {
    const currentPassword = await WalletService.loadWalletPassword();
    setSavedPassword(currentPassword);
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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

  const validationCheck = async () => {
    const storedPassword = savedPassword;
    const currentPassword = currPwd;
    const newPassword = newPwd;
    const newConfirmPassword = confirmPwd;

    let isValid = true;
    let errorMessage = '';
    try {
      ValidationService.validateInvalidPassword(currentPassword, storedPassword);
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
      ValidationService.validateWrongPasswordLength(newPassword);
      ValidationService.validateEqualsChangePassword(newPassword, currentPassword);
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
      ValidationService.validateNotMatchConfirmPassword(newPassword, newConfirmPassword);
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
        const walletState = await createWallet({ mnemonic: wallet?.getMnemonic(), password: newPassword }, true);
        return walletState;
      } catch (e) {
        console.error(e);
      }
    }
    return 'FAIL';
  };
  const cancelButtonClick = () => navigate(RoutePath.Setting);

  const saveButtonClick = async () => {
    const state = await validationCheck();
    if (state === 'FINISH') {
      if (wallet) {
        return navigate(RoutePath.Setting);
      }
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
