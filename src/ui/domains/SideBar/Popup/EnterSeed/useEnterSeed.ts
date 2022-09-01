import { EnglishMnemonic } from '@cosmjs/crypto';
import { RoutePath } from '@router/path';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const testSeed = '123';
const specialPatternCheck = /[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"]/g;

export const useEnterSeed = () => {
  const navigate = useNavigate();
  const [seed, setSeed] = useState('');
  const [error, setError] = useState(false);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      const patternCheck = e.target.value.replace(specialPatternCheck, '');
      setSeed(() => patternCheck.toLowerCase());
    },
    [seed],
  );
  const handleButtonClick = () => {
    try {
      const checkedMnemonic = new EnglishMnemonic(seed);
      if (checkedMnemonic) {
        setError(false);
        navigate(RoutePath.CreatePassword, {
          state: { seeds: seed },
        });
      } else {
        setError(true);
      }
    } catch (e) {
      setError(true);
    }
  };

  useEffect(() => {
    if (seed === '') setError(false);
  }, [seed]);

  return {
    seedState: {
      value: seed,
      onChange,
      error: error,
      errorMessage: 'Invalid seed phrase',
    },
    buttonState: {
      onClick: handleButtonClick,
      disabled: !seed,
    },
  };
};
