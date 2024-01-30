import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AdenaWallet } from 'adena-module';

import { RoutePath } from '@types';
import { PasswordValidationError } from '@common/errors';
import {
  validateEmptyPassword,
  validateNotMatchConfirmPassword,
  validateWrongPasswordLength,
} from '@common/validation';
import useAppNavigate from '@hooks/use-app-navigate';
import { useAdenaContext } from '@hooks/use-context';

export type UseCreatePasswordScreenReturn = {
  passwordState: {
    value: string;
    confirm: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    errorMessage: string;
    error: boolean;
    ref: React.RefObject<HTMLInputElement>;
  };
  confirmPasswordState: {
    value: string;
    confirm: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error: boolean;
  };
  termsState: {
    value: boolean;
    onChange: () => void;
  };
  errorMessage: string;
  buttonState: {
    onClick: () => void;
    disabled: boolean;
  };
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
};

export const useCreatePasswordScreen = (): UseCreatePasswordScreenReturn => {
  const { walletService, accountService } = useAdenaContext();
  const { navigate, params } = useAppNavigate<RoutePath.WebCreatePassword>();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [inputs, setInputs] = useState({
    password: '',
    confirmPassword: '',
  });
  const [terms, setTerms] = useState(false);
  const [isPasswordError, setIsPasswordError] = useState(false);
  const [isConfirmPasswordError, setIsConfirmPasswordError] = useState(false);
  const { password, confirmPassword } = inputs;
  const [errorMessage, setErrorMessage] = useState('');
  const [passwordErrorMessage, setPasswordErrorMessage] = useState('');

  const disabledCreateButton = useMemo(() => {
    return !terms || !password || !confirmPassword;
  }, [terms, password, confirmPassword]);

  const confirmPasswordLength = (password: string): boolean => {
    if (password.length < 8 || password.length > 256) {
      return false;
    }
    return true;
  };

  const _validateConfirmPassword = (validationPassword?: boolean): boolean => {
    try {
      if (validateNotMatchConfirmPassword(password, confirmPassword)) return true;
    } catch (error) {
      if (error instanceof PasswordValidationError) {
        switch (error.getType()) {
          case 'NOT_MATCH_CONFIRM_PASSWORD':
            setIsConfirmPasswordError(true);
            break;
          default:
            break;
        }
        if (validationPassword) {
          setErrorMessage(error.message);
        }
      }
    }
    return false;
  };

  const _validateInputPassword = (): boolean => {
    try {
      validateEmptyPassword(password);
      validateWrongPasswordLength(password);
      return true;
    } catch (error) {
      console.log(error);
      setIsPasswordError(true);
      if (error instanceof PasswordValidationError) {
        setPasswordErrorMessage(error.message);
      }
    }
    return false;
  };

  const validateMatchPassword = (): boolean => {
    const validatedInputPassword = _validateInputPassword();
    const validatedConfirmPassword = _validateConfirmPassword(validatedInputPassword);

    try {
      if (validatedInputPassword && validatedConfirmPassword) {
        return true;
      }
    } catch (error) {
      console.error(error);
    }
    return false;
  };

  const _saveWalletByPassword = async (password: string): Promise<void> => {
    const { serializedWallet } = params;
    const wallet = await AdenaWallet.deserialize(serializedWallet, '');
    await walletService.saveWallet(wallet, password);
    await accountService.changeCurrentAccount(wallet.currentAccount);
  };

  const onChangePassword = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setInputs({ ...inputs, [name]: value });
    },
    [inputs],
  );

  const toggleTermState = useCallback((): void => {
    setTerms((prev: boolean) => !prev);
  }, []);

  const onClickCreateButton = async (): Promise<void> => {
    const validated = validateMatchPassword();
    if (!validated) {
      return;
    }

    _saveWalletByPassword(password).then(() => {
      navigate(RoutePath.WebWalletAllSet);
    });
  };

  const onKeyDownInput = useCallback(
    () => (e: React.KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === 'Enter') {
        if (disabledCreateButton) {
          return;
        }
        onClickCreateButton();
      }
    },
    [disabledCreateButton, onClickCreateButton],
  );

  useEffect(() => {
    setIsPasswordError(false);
    setIsConfirmPasswordError(false);
    setErrorMessage('');
    setPasswordErrorMessage('');
  }, [password, confirmPassword]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  return {
    passwordState: {
      value: password,
      confirm: confirmPasswordLength(password),
      onChange: onChangePassword,
      error: isPasswordError,
      errorMessage: passwordErrorMessage,
      ref: inputRef,
    },
    confirmPasswordState: {
      value: confirmPassword,
      confirm: confirmPasswordLength(confirmPassword),
      onChange: onChangePassword,
      error: isConfirmPasswordError,
    },
    termsState: {
      value: terms,
      onChange: toggleTermState,
    },
    errorMessage,
    buttonState: {
      onClick: onClickCreateButton,
      disabled: disabledCreateButton,
    },
    onKeyDown: onKeyDownInput,
  };
};
