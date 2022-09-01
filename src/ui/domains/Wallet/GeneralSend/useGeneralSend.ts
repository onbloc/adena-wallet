import { RoutePath } from '@router/path';
import { useSdk } from '@services/client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const startStringCheck = /^g1/;
const atozAndNumberCheck = /^[a-z0-9]{40}$/;
const specialPatternCheck = /\W|\s/g;
const addressValidationCheck = (v: string) =>
  startStringCheck.test(v) && atozAndNumberCheck.test(v) ? true : false;
const fee = 0.000001;

export const useGeneralSend = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { balance } = useSdk();
  const nowAmount = Number(balance[0].amount);
  const [address, setAddress] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [addressError, setAddressError] = useState<boolean>(false);
  const [amountError, setAmountError] = useState<boolean>(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.key === 'Enter' && Boolean(address) && Boolean(amount)) {
      nextButtonClick();
    }
  };

  const amountChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      const v = e.target.value;
      const charAtFirst = v.charAt(0);
      const charAtSecond = v.charAt(1);
      let charAtZeroCheck: string | null = v;
      if (Number(charAtSecond) >= 1 && charAtFirst === '0') {
        charAtZeroCheck = v.replace(/(^0+)/, '');
      } else if (Number(charAtSecond) === 0 && charAtFirst === '0') {
        charAtZeroCheck = v.replace(/(^0+)/, '0');
      } else if (charAtFirst === '.') {
        charAtZeroCheck = `0${v}`;
      }
      setAmount(charAtZeroCheck);
    },
    [amount],
  );

  const addressChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      const patternCheck = e.target.value.replace(specialPatternCheck, '');
      setAddress(() => patternCheck.toLowerCase());
    },
    [address],
  );

  const prevButtonClick = () => navigate(-1);

  const cancelButtonClick = () =>
    location.state === 'token' ? navigate(RoutePath.TokenDetails) : navigate(RoutePath.Wallet);

  const maxButtonClick = () =>
    setAmount(() => String(nowAmount - fee < 0 ? 0 : (nowAmount - fee).toFixed(6)));

  const nextButtonClick = () => {
    const addressErrorCheck = addressValidationCheck(address);
    const amountErrorCheck = Number(amount) < nowAmount && Number(amount) - fee > 0 ? true : false;
    if (addressErrorCheck && amountErrorCheck)
      navigate(RoutePath.SendConfirm, {
        state: {
          address: address,
          amount: amount,
          from: location.state === 'token' ? 'token' : 'general',
        },
      });
    if (!addressErrorCheck) {
      setAddressError(true);
    }
    if (!amountErrorCheck) {
      setAmountError(true);
    }
  };

  const resizeTextArea = () => {
    if (!textAreaRef.current) return;
    textAreaRef.current.style.height = 'auto';
    textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
  };

  useEffect(() => {
    setAddressError(false);
    resizeTextArea();
  }, [address]);
  useEffect(() => {
    setAmountError(false);
  }, [amount]);

  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.focus();
    }
  }, [textAreaRef]);

  return {
    maxClick: maxButtonClick,
    addressState: {
      value: address,
      onChange: addressChange,
      error: addressError,
      errorMessage: addressError ? 'Invalid address' : '',
    },
    amountState: {
      value: amount,
      onChange: amountChange,
      error: amountError,
      errorMessage: amountError ? 'Insufficient balance' : '',
    },
    buttonState: {
      prev: {
        show: location.state === 'token' ? false : true,
        onClick: prevButtonClick,
      },
      max: maxButtonClick,
      cancel: cancelButtonClick,
      next: nextButtonClick,
      disabled: Boolean(!address || !amount),
    },
    textAreaRef,
    onKeyDown,
  };
};
