import { useState, useCallback, useEffect, useRef } from 'react';
import { decryption, encryption } from '@services/utils';
import { Secp256k1HdWallet } from '@services/signer';
import { useSdk } from '@services/client';
import { walletDeserialize } from '@services/client/fetcher';
import { useLocation, useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';

export const useLogin = () => {
  const sdk = useSdk();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const location = useLocation();

  const tryLogin = (password: string) => {
    walletDeserialize(password)
      .then((wallet) => {
        sdk.init(wallet);
        return sdk.initialized;
      })
      .catch((err) => setError(true))
      .then((init) => navigate(RoutePath.Wallet))
      .catch((err) => setError(true));
  };

  const tryLoginApprove = (password: string) => {
    walletDeserialize(password)
      .then((wallet) => {
        sdk.init(wallet);
        return sdk.initialized;
      })
      .catch((err) => setError(true))
      .then((init) => {
        navigate(RoutePath.ApproveTransaction);
      })
      .catch((err) => setError(true));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && location.pathname === '/wallet/approve-transaction-login') {
      tryLoginApprove(password);
    } else if (e.key === 'Enter' && location.pathname === '/login') {
      tryLogin(password);
    }
  };

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value),
    [password],
  );
  const unlockButtonClick = () => {
    tryLogin(password);
  };
  const approveButtonClick = () => {
    tryLoginApprove(password);
  };
  const forgotButtonClick = () => navigate(RoutePath.EnterSeedPharse);

  useEffect(() => {
    setError(false);
  }, [password]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  const navigate = useNavigate();

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
