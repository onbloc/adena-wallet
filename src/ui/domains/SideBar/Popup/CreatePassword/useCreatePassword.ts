import { RoutePath } from '@router/path';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Secp256k1HdWallet } from '@services/signer';
import { useSdk } from '@services/client';
import { encryption } from '@services/utils';

export const useCreatePassword = () => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [inputs, setInputs] = useState({
    pwd: '',
    confirmPwd: '',
  });
  const [terms, setTerms] = useState(false);
  const [isPwdError, setIsPwdError] = useState(false);
  const [isConfirmPwdError, setIsConfirmPwdError] = useState(false);
  const { pwd, confirmPwd } = inputs;
  const sdk = useSdk();
  const [seeds, SetSeeds] = useState('');

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && terms && pwd && confirmPwd) {
      nextButtonClick();
    }
  };

  const handleTermsChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setTerms((prev: boolean) => !prev);
  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setInputs((input) => ({ ...input, [name]: value }));
    },
    [pwd, confirmPwd],
  );

  const isValidPwd = pwd.length < 8 || pwd.length > 23;
  const isErrorPwd = !(pwd === '') && isValidPwd;
  const isMatchedPwd = pwd === confirmPwd;
  const isPwdConfirmValidationPass = confirmPwd === '' || !isMatchedPwd;

  const validationCheck = async () => {
    chrome.storage.local.clear(function () {
      const error = chrome.runtime.lastError;
      if (error) {
        console.error(error);
      }
    });
    chrome.storage.sync.clear();

    const wallet = await Secp256k1HdWallet.fromMnemonic(seeds);
    if (sdk.initialized) {
      await sdk.changeSigner(wallet);
    } else {
      await sdk.init(wallet);
    }
    
    const walletSerialize = await wallet.serialize(pwd);
    chrome.storage.local.set({ adenaWallet: walletSerialize }, () => {
      encryption(pwd);
      navigate(RoutePath.LaunchAdena);
    });
  };

  const nextButtonClick = () => {
    if (isMatchedPwd && !isErrorPwd) {
      (async () => {
        await validationCheck();
      })();
    }
    if (isPwdConfirmValidationPass) setIsConfirmPwdError(true);
    if (isErrorPwd) setIsPwdError(true);
  };

  const getErrorMessage = () => {
    if (isPwdError) return 'Password must be 8-23 characters';
    if (isConfirmPwdError) return 'Passwords do not match';
    return '';
  };

  useEffect(() => {
    setIsPwdError(false);
    setIsConfirmPwdError(false);
  }, [pwd, confirmPwd]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

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
    errorMessage: getErrorMessage(),
    buttonState: {
      onClick: nextButtonClick,
      disabled: terms && pwd && confirmPwd ? false : true,
    },
    setSeeds: SetSeeds,
    onKeyDown,
  };
};
