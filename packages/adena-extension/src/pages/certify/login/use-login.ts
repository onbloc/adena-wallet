import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import { useAdenaContext } from '@hooks/use-context';
import { useRecoilState } from 'recoil';
import { WalletState } from '@states';
import { useLoadAccounts } from '@hooks/use-load-accounts';

export type UseLoginReturn = {
  passwordState: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClick: () => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    error: boolean;
    ref: React.RefObject<HTMLInputElement>;
  };
  unlockButtonClick: () => void;
  forgotButtonClick: () => void;
  tryLogin: (password: string) => Promise<void>;
  approveButtonClick: () => void;
};

export const useLogin = (): UseLoginReturn => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { walletService } = useAdenaContext();
  const { loadAccounts } = useLoadAccounts();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [, setState] = useRecoilState(WalletState.state);

  const tryLogin = async (password: string): Promise<void> => {
    const equalPassword = await walletService.equalsPassword(password);
    if (equalPassword) {
      await walletService.updatePassword(password);
      setState('LOADING');
      await loadAccounts();
      navigate(RoutePath.Wallet);
    }
  };

  const tryLoginApprove = (password: string): void => {
    tryLogin(password);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && location.pathname === RoutePath.ApproveLogin) {
      tryLoginApprove(password);
    } else if (e.key === 'Enter' && location.pathname === '/login') {
      tryLogin(password);
    }
  };

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value),
    [password],
  );

  const unlockButtonClick = (): Promise<void> => tryLogin(password);

  const approveButtonClick = (): void => tryLoginApprove(password);

  const forgotButtonClick = (): void => navigate(RoutePath.EnterSeedPhrase);

  useEffect(() => {
    setError(false);
  }, [password]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  const handlePwClick = (): void => {
    tryLogin(password);
  };

  return {
    passwordState: {
      value: password,
      onChange,
      onClick: handlePwClick,
      onKeyDown,
      error: error,
      ref: inputRef,
    },
    unlockButtonClick,
    forgotButtonClick,
    tryLogin: tryLogin,
    approveButtonClick,
  };
};
