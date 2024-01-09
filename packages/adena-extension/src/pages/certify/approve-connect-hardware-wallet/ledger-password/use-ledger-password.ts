import { RoutePath } from '@router/path';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PasswordValidationError } from '@common/errors';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import {
  validateEmptyPassword,
  validateNotMatchConfirmPassword,
  validateWrongPasswordLength,
} from '@common/validation';
import {
  AdenaWallet,
  AdenaLedgerConnector,
  LedgerKeyring,
  deserializeAccount,
  isLedgerAccount,
} from 'adena-module';
import useAppNavigate from '@hooks/use-app-navigate';

export type UseLedgerPasswordReturn = {
  pwdState: {
    value: string;
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

export const useLedgerPassword = (): UseLedgerPasswordReturn => {
  const { walletService, accountService } = useAdenaContext();
  useWalletContext();
  const { navigate, params } = useAppNavigate<RoutePath.ApproveHardwareWalletLedgerPassword>();
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
      validateWrongPasswordLength(password);
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

  const validationCheck = async (): Promise<'FINISH' | 'FAIL'> => {
    const isValidPassword = validationPassword();
    const isValidConfirmPassword = validationConfirmPassword(isValidPassword);

    try {
      if (isValidPassword && isValidConfirmPassword) {
        return 'FINISH';
      }
    } catch (error) {
      console.error(error);
    }
    return 'FAIL';
  };

  const nextButtonClick = async (): Promise<void> => {
    const validationState = await validationCheck();
    if (validationState === 'FINISH') {
      const { accounts } = params;
      const transport = await AdenaLedgerConnector.openConnected();
      if (!transport) {
        return;
      }
      const deserializeAccounts = accounts.map(deserializeAccount).filter(isLedgerAccount);
      const keyring = await LedgerKeyring.fromLedger(AdenaLedgerConnector.fromTransport(transport));
      const mappedAccounts = deserializeAccounts.map((account) => {
        return {
          ...account.toData(),
          name: `Ledger ${account.hdPath + 1}`,
          keyringId: keyring.id,
        };
      });
      const ledgerWallet = new AdenaWallet({
        accounts: [...mappedAccounts],
        keyrings: [keyring.toData()],
        currentAccountId: mappedAccounts[0]?.id,
      });
      await accountService.changeCurrentAccount(ledgerWallet.currentAccount);
      await walletService.saveWallet(ledgerWallet, pwd);
      await transport.close();
      navigate(RoutePath.ApproveHardwareWalletLedgerAllSet);
      return;
    }
  };

  return {
    pwdState: {
      value: pwd,
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
