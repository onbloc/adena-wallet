import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PasswordValidationError } from '@common/errors';
import { useAdenaContext } from '@hooks/use-context';
import {
  validateEmptyPassword,
  validateNotMatchConfirmPassword,
  validatePasswordComplexity,
} from '@common/validation';
import { AdenaWallet } from 'adena-module';
import useAppNavigate from '@hooks/use-app-navigate';
import { CreateAccountState, GoogleState, LedgerState, SeedState, RoutePath } from '@types';
import { evaluatePassword, EvaluatePasswordResult } from '@common/utils/password-utils';

export type UseCreatePasswordReturn = {
  pwdState: {
    value: string;
    evaluationResult: EvaluatePasswordResult | null;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    error: boolean;
    ref: React.RefObject<HTMLInputElement>;
  };
  confirmPwdState: {
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

export const useCreatePassword = (): UseCreatePasswordReturn => {
  const { navigate, params } = useAppNavigate<RoutePath.CreatePassword>();
  const { walletService, accountService } = useAdenaContext();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [inputs, setInputs] = useState({
    pwd: '',
    confirmPwd: '',
  });
  const [terms, setTerms] = useState(false);
  const [isPwdError, setIsPwdError] = useState(false);
  const [isConfirmPwdError, setIsConfirmPwdError] = useState(false);
  const { pwd, confirmPwd } = inputs;
  const [errorMessage, setErrorMessage] = useState('');
  const [activated, setActivated] = useState(false);

  const passwordEvaluationResult = useMemo(() => {
    if (pwd.length > 0) {
      return evaluatePassword(pwd);
    }
    return null;
  }, [pwd]);

  useEffect(() => {
    setIsPwdError(false);
    setIsConfirmPwdError(false);
    setErrorMessage('');
  }, [pwd, confirmPwd]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  useEffect(() => {
    if (activated) {
      create();
    }
  }, [activated]);

  const isSeedPhrase = (state: CreateAccountState): state is SeedState => {
    return state.type === 'SEED';
  };

  const isLedgerState = (state: CreateAccountState): state is LedgerState => {
    return state.type === 'LEDGER';
  };

  const isGoogleState = (state: CreateAccountState): state is GoogleState => {
    return state.type === 'GOOGLE';
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && terms && pwd && confirmPwd) {
      nextButtonClick();
    }
  };

  const handleTermsChange = (): void => setTerms((prev: boolean) => !prev);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setInputs((input) => ({ ...input, [name]: value }));
    },
    [pwd, confirmPwd],
  );

  const validationConfirmPassword = (isValidPassword?: boolean): boolean => {
    const password = pwd;
    const confirmPassword = confirmPwd;
    try {
      if (validateNotMatchConfirmPassword(password, confirmPassword)) return true;
    } catch (error) {
      if (error instanceof PasswordValidationError) {
        switch (error.getType()) {
          case 'NOT_MATCH_CONFIRM_PASSWORD':
            setIsConfirmPwdError(true);
            break;
          default:
            break;
        }
        if (isValidPassword) {
          setErrorMessage(error.message);
        }
      }
    }
    return false;
  };

  const validationPassword = (): boolean => {
    const password = pwd;
    try {
      validateEmptyPassword(password);
      validatePasswordComplexity(password);
      return true;
    } catch (error) {
      console.log(error);
      setIsPwdError(true);
      if (error instanceof PasswordValidationError) {
        setErrorMessage(error.message);
      }
    }
    return false;
  };

  const validationCheck = async (): Promise<boolean> => {
    const isValidPassword = validationPassword();
    const isValidConfirmPassword = validationConfirmPassword(isValidPassword);
    return isValidPassword && isValidConfirmPassword;
  };

  const createAccounts = (): 'FAIL' | Promise<'FAIL' | 'FINISH'> => {
    if (isSeedPhrase(params)) {
      return createWalletAccountsBySeed(params);
    }
    if (isGoogleState(params)) {
      return createWalletAccountsByGoogle(params);
    }
    if (isLedgerState(params)) {
      return 'FAIL';
    }
    return 'FAIL';
  };

  const createWalletAccountsBySeed = async (seedState: SeedState): Promise<'FAIL' | 'FINISH'> => {
    try {
      const wallet = await walletService.createWallet({
        mnemonic: seedState.seeds,
        password: pwd,
      });
      await accountService.changeCurrentAccount(wallet.currentAccount);
      await walletService.changePassword(pwd);
    } catch (error) {
      console.error(error);
      return 'FAIL';
    }
    return 'FINISH';
  };

  const createWalletAccountsByGoogle = async (
    googleState: GoogleState,
  ): Promise<'FAIL' | 'FINISH'> => {
    try {
      const wallet = await AdenaWallet.createByWeb3Auth(googleState.privateKey);
      await accountService.changeCurrentAccount(wallet.currentAccount);
      await walletService.saveWallet(wallet, pwd);
    } catch (error) {
      console.error(error);
      return 'FAIL';
    }
    return 'FINISH';
  };

  const create = async (): Promise<void> => {
    const validationState = await validationCheck();
    if (!validationState) {
      setActivated(false);
      return;
    }
    await accountService.clear();
    const result = await createAccounts();
    if (result === 'FINISH') {
      navigate(RoutePath.LaunchAdena, { state: params });
      setActivated(false);
      return;
    }
  };

  const nextButtonClick = async (): Promise<void> => {
    if (activated) {
      return;
    }

    setActivated(true);
  };

  return {
    pwdState: {
      value: pwd,
      evaluationResult: passwordEvaluationResult,
      onChange: onChange,
      error: isPwdError,
      ref: inputRef,
    },
    confirmPwdState: {
      value: confirmPwd,
      onChange: onChange,
      error: isConfirmPwdError,
    },
    termsState: {
      value: terms,
      onChange: handleTermsChange,
    },
    errorMessage: errorMessage,
    buttonState: {
      onClick: nextButtonClick,
      disabled: terms && pwd && confirmPwd ? false : true,
    },
    onKeyDown,
  };
};
