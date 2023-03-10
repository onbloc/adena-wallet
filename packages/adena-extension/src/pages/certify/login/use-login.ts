import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import { useAdenaContext } from '@hooks/use-context';
import { useRecoilState } from 'recoil';
import { WalletState } from '@states/index';
import { useLoadAccounts } from '@hooks/use-load-accounts';

export const useLogin = () => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { walletService } = useAdenaContext();
  const { loadAccounts } = useLoadAccounts();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [, setState] = useRecoilState(WalletState.state);

  const tryLogin = async (password: string) => {
    const equalPassword = await walletService.equalsPassowrd(password);
    if (equalPassword) {
      await walletService.updatePassowrd(password);
      setState("LOADING");
      await loadAccounts();
      navigate(RoutePath.Wallet);
    }
  };

  const tryLoginApprove = (password: string) => {
    tryLogin(password);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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

  const unlockButtonClick = () => tryLogin(password);

  const approveButtonClick = () => tryLoginApprove(password);

  const forgotButtonClick = () => navigate(RoutePath.EnterSeedPhrase);

  useEffect(() => {
    setError(false);
  }, [password]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  const handlePwClick = () => {
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
