import { RoutePath } from '@router/path';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { encryption, decryption } from '@services/utils';
import { Secp256k1HdWallet } from '@services/signer';

const lengthCheck = /^.{8,23}$/;

const getSavedPassword = async () => {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.session.get(
        {
          encryptedPassword: '',
          encryptedKey: '',
        },
        function (result: any) {
          if (result.encryptedPassword && result.encryptedKey) {
            // decrypt and route
            const plainPassword = decryption(result.encryptedPassword, result.encryptedKey);
            // console.log(plainPassword);
            resolve(plainPassword);
          }
        },
      );
    } catch (err) {
      reject(err);
    }
  });
};

export const useChangePassword = () => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [inputs, setInputs] = useState({
    currPwd: '',
    newPwd: '',
    confirmPwd: '',
  });
  const { currPwd, newPwd, confirmPwd } = inputs;

  const [isCurrPwdError, setIsCurrPwdError] = useState(false);
  const [isNewPwdError, setIsNewPwdError] = useState(false);
  const [isConfirmPwdError, setIsConfirmPwdError] = useState(false);
  const [savedPassword, setSavedPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // @ts-ignore
    getSavedPassword().then((r) => setSavedPassword(r));
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && currPwd && newPwd && confirmPwd) {
      saveButtonClick();
    }
  };

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setInputs((inputs) => ({ ...inputs, [name]: value }));
    },
    [currPwd, newPwd, confirmPwd],
  );

  const isCurrPwdNotMatched = currPwd !== savedPassword;
  const isNewPwdEqualToCurrPwd = newPwd === savedPassword;
  const isNotValidNewPwd = lengthCheck.test(newPwd);
  const isNotValidConfirmPwd = lengthCheck.test(confirmPwd);
  const isConfirmPwdNotMatched = confirmPwd !== newPwd;

  const getErrorMessage = () => {
    if (isCurrPwdNotMatched) return setErrorMsg('Invalid password');
    if (isNewPwdEqualToCurrPwd) return setErrorMsg('You can’t use your current password');
    if (!isNotValidNewPwd) return setErrorMsg('Password must be 8~23 characters');
    if (isConfirmPwdNotMatched) return setErrorMsg('Passwords do not match');
    return setErrorMsg('');
  };

  // 세팅으로 라우트
  const cancelButtonClick = () => navigate(RoutePath.Setting);

  // 비번 바꿔야 함
  const saveButtonClick = async () => {
    if (
      !isCurrPwdNotMatched &&
      !isNewPwdEqualToCurrPwd &&
      isNotValidNewPwd &&
      isNotValidConfirmPwd &&
      !isConfirmPwdNotMatched
    ) {
      // await chrome.storage.session.clear();
      chrome.storage.local.get(['adenaWallet'], async (r) => {
        const walletWithOldPass = await Secp256k1HdWallet.deserialize(r.adenaWallet, savedPassword);
        const walletWithNewPass = await walletWithOldPass.serialize(newPwd);

        chrome.storage.local.set({ adenaWallet: walletWithNewPass }, () => {
          chrome.storage.session.clear();
          encryption(newPwd);

          return navigate(RoutePath.Setting);
        });
      });
    }

    if (isCurrPwdNotMatched) {
      setIsCurrPwdError(true);
    }
    if (!isNotValidNewPwd || isNewPwdEqualToCurrPwd) {
      setIsNewPwdError(true);
    }
    if (isConfirmPwdNotMatched) {
      setIsConfirmPwdError(true);
    }
    getErrorMessage();
  };

  useEffect(() => {
    setIsCurrPwdError(false);
    setIsNewPwdError(false);
    setIsConfirmPwdError(false);
    setErrorMsg('');
  }, [currPwd, newPwd, confirmPwd]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  return {
    currPwdState: {
      value: currPwd,
      onChange: onChange,
      error: isCurrPwdError,
      ref: inputRef,
    },
    newPwdState: {
      value: newPwd,
      onChange: onChange,
      error: isNewPwdError,
    },
    confirmPwdState: {
      value: confirmPwd,
      onChange: onChange,
      error: isConfirmPwdError,
    },
    errorMessage: errorMsg,
    buttonState: {
      onClick: {
        cancel: cancelButtonClick,
        save: saveButtonClick,
      },
      disabled: Object.values(inputs).some((el) => el === ''),
    },
    onKeyDown,
  };
};
