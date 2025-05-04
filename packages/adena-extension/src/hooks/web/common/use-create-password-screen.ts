import { AdenaWallet } from 'adena-module';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { PasswordValidationError } from '@common/errors';
import { evaluatePassword, EvaluatePasswordResult } from '@common/utils/password-utils';
import {
  validateEmptyPassword,
  validateNotMatchConfirmPassword,
  validatePasswordComplexity,
} from '@common/validation';
import useAppNavigate from '@hooks/use-app-navigate';
import { useAdenaContext } from '@hooks/use-context';
import useIndicatorStep, {
  UseIndicatorStepReturn,
} from '@hooks/wallet/broadcast-transaction/use-indicator-step';
import { RoutePath } from '@types';

export type UseCreatePasswordScreenReturn = {
  passwordState: {
    value: string;
    evaluationResult: EvaluatePasswordResult | null;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    errorMessage: string;
    error: boolean;
    ref: React.RefObject<HTMLInputElement>;
  };
  confirmPasswordState: {
    value: string;
    evaluationResult: EvaluatePasswordResult | null;
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
  indicatorInfo: UseIndicatorStepReturn;
  validateMatchPassword: () => boolean;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  clearPassword: () => void;
};

export const useCreatePasswordScreen = (): UseCreatePasswordScreenReturn => {
  const { walletService, accountService } = useAdenaContext();
  const indicatorInfo = useIndicatorStep({});
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

  const passwordEvaluationResult = useMemo(() => {
    if (password.length > 0) {
      return evaluatePassword(password);
    }
    return null;
  }, [password]);

  const confirmPasswordEvaluationResult = useMemo(() => {
    if (confirmPassword.length > 0) {
      return evaluatePassword(confirmPassword);
    }
    return null;
  }, [confirmPassword]);

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
      validatePasswordComplexity(password);
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

  const clearPassword = (): void => {
    setInputs({ password: '', confirmPassword: '' });
  };

  const _saveWalletByPassword = async (password: string): Promise<void> => {
    const { serializedWallet } = params;
    const wallet = await AdenaWallet.deserialize(serializedWallet, '');
    await walletService.saveWallet(wallet, password);
    await accountService.changeCurrentAccount(wallet.currentAccount);
    await setInputs({ password: '', confirmPassword: '' });
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
    () =>
      (e: React.KeyboardEvent<HTMLInputElement>): void => {
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
    indicatorInfo,
    passwordState: {
      value: password,
      evaluationResult: passwordEvaluationResult,
      onChange: onChangePassword,
      error: isPasswordError,
      errorMessage: passwordErrorMessage,
      ref: inputRef,
    },
    confirmPasswordState: {
      value: confirmPassword,
      evaluationResult: confirmPasswordEvaluationResult,
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
    validateMatchPassword,
    onKeyDown: onKeyDownInput,
    clearPassword,
  };
};
