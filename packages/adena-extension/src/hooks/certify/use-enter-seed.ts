import { EnglishMnemonic } from 'adena-module';
import { useCallback, useEffect, useState } from 'react';

import { RoutePath } from '@router/path';
import useAppNavigate from '@hooks/use-app-navigation';

const specialPatternCheck = /[{}[]\/?.,;:|\)*~`!^-_+<>@#$%&\\=\('"]/g;

export const useEnterSeed = (): {
  seedState: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
    error: boolean;
    errorMessage: string;
  };
  termsState: { terms: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void };
  buttonState: { onClick: () => Promise<void>; disabled: boolean };
} => {
  const { navigate } = useAppNavigate();
  const [seeds, setSeeds] = useState('');
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState(false);

  const handleTermsChange = useCallback(() => setTerms((prev: boolean) => !prev), [terms]);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      const patternCheck = e.target.value.replace(specialPatternCheck, '');
      setSeeds(() => patternCheck.toLowerCase());
      setError(false);
    },
    [seeds],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleButtonClick();
    }
  };

  const handleButtonClick = async (): Promise<void> => {
    if (seeds.length === 0 || !terms) {
      return;
    }

    try {
      const checkedMnemonic = new EnglishMnemonic(seeds);
      if (checkedMnemonic) {
        navigate(RoutePath.CreatePassword, {
          state: {
            type: 'SEED',
            seeds,
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
    if (seeds === '') {
      setError(false);
    }
  }, [seeds]);

  return {
    seedState: {
      value: seeds,
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
      disabled: seeds !== '' && terms,
    },
  };
};
