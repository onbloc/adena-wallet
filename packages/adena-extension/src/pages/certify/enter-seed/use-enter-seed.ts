import { RoutePath } from '@router/path';
import { EnglishMnemonic } from 'adena-module/src/crypto';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const specialPatternCheck = /[{}[]\/?.,;:|\)*~`!^-_+<>@#$%&\\=\('"]/g;

export const useEnterSeed = () => {
  const navigate = useNavigate();
  const [seed, setSeed] = useState('');
  const [error, setError] = useState(false);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      const patternCheck = e.target.value.replace(specialPatternCheck, '');
      setSeed(() => patternCheck.toLowerCase());
      setError(false);
    },
    [seed],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleButtonClick();
    }
  };

  const handleButtonClick = async () => {
    if (seed.length === 0) {
      return;
    }

    try {
      const checkedMnemonic = new EnglishMnemonic(seed);
      if (checkedMnemonic) {
        navigate(RoutePath.CreatePassword, {
          state: {
            type: "SEED",
            seeds: seed
          },
        });
        setError(false);
        return;
      }
    } catch (e) {
      console.log(e);
    }
    setError(true);
  };

  useEffect(() => {
    if (seed === '') {
      setError(false);
    }
  }, [seed]);

  return {
    seedState: {
      value: seed,
      onChange,
      onKeyDown,
      error: error,
      errorMessage: 'Invalid seed phrase',
    },
    buttonState: {
      onClick: handleButtonClick,
      disabled: !seed,
    },
  };
};
