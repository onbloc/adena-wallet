import { RoutePath } from '@router/path';
import { EnglishMnemonic } from 'adena-module';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const specialPatternCheck = /[{}[]\/?.,;:|\)*~`!^-_+<>@#$%&\\=\('"]/g;

export const useEnterSeed = () => {
  const navigate = useNavigate();
  const [seed, setSeed] = useState(
    'annual assist portion motion suit spoil talk urban mesh report churn album',
  );
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState(false);

  const handleTermsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setTerms((prev: boolean) => !prev),
    [terms],
  );

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
    if (seed.length === 0 || !terms) {
      return;
    }

    try {
      const checkedMnemonic = new EnglishMnemonic(seed);
      if (checkedMnemonic) {
        navigate(RoutePath.CreatePassword, {
          state: {
            type: 'SEED',
            seeds: seed,
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
    termsState: {
      terms,
      onChange: handleTermsChange,
    },
    buttonState: {
      onClick: handleButtonClick,
      disabled: seed !== '' && terms,
    },
  };
};
