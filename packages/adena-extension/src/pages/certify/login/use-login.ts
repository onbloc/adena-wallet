import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import { useWalletLoader } from '@hooks/use-wallet-loader';

export const useLogin = () => {
  const [, , loadByPassword] = useWalletLoader();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const tryLogin = (password: string) => {
    loadByPassword(password);
  };

  const tryLoginApprove = (password: string) => {
    loadByPassword(password);
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

  const handlePwClick = (e: any) => {
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
