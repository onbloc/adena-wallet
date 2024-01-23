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
import { useAdenaContext, useWalletContext } from '@hooks/use-context';

export type UseCreatePasswordScreenReturn = {
  passwordState: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error: boolean;
    ref: React.RefObject<HTMLInputElement>;
  };
  confirmPasswordState: {
    value: string;
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
  const { updateWallet } = useWalletContext();
  const { walletService } = useAdenaContext();
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

  const disabledCreateButton = useMemo(() => {
    return !terms || !password || !confirmPassword;
  }, [terms, password, confirmPassword]);

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
        setErrorMessage(error.message);
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
    await updateWallet(wallet);
  };

  const onChangePassword = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputs((input) => ({ ...input, [name]: value }));
  }, []);

  const toggleTermState = useCallback((): void => {
    setTerms((prev: boolean) => !prev);
  }, []);

  const onClickCreateButton = useCallback(async (): Promise<void> => {
    const validated = validateMatchPassword();
    if (!validated) {
      return;
    }

    _saveWalletByPassword(password);

    navigate(RoutePath.WebWalletAllSet);
  }, [password]);

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
  }, [password, confirmPassword]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  return {
    passwordState: {
      value: password,
      onChange: onChangePassword,
      error: isPasswordError,
      ref: inputRef,
    },
    confirmPasswordState: {
      value: confirmPassword,
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
