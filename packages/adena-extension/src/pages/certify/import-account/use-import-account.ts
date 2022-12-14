import { RoutePath } from '@router/path';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const useImportAccount = () => {
  const navigate = useNavigate();
  const [privateKey, setPrivateKey] = useState('');
  const [error, setError] = useState(false);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      setPrivateKey(e.target.value);
    },
    [privateKey],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      importButtonClick();
    }
  };

  const importButtonClick = () => {
    try {
      if (privateKey === '123') {
        navigate(RoutePath.Home, { replace: true });
      }
    } catch (e) {
      console.log(e);
    }
    setError(true);
  };

  useEffect(() => {
    if (privateKey === '') {
      setError(false);
    }
  }, [privateKey]);

  const cancelButtonClick = () => navigate(-1);

  return {
    privateKeyState: {
      value: privateKey,
      onChange,
      onKeyDown,
      error: error,
      errorMessage: 'Invalid private key',
    },
    buttonState: {
      cancel: cancelButtonClick,
      import: importButtonClick,
      disabled: !privateKey,
    },
  };
};
