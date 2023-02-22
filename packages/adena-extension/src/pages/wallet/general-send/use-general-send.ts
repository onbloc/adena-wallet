import { useWalletBalances } from '@hooks/use-wallet-balances';
import { RoutePath } from '@router/path';
import { addressValidationCheck } from '@common/utils/client-utils';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWalletAccounts } from '@hooks/use-wallet-accounts';
import { useWallet } from '@hooks/use-wallet';
import { useCurrentAccount } from '@hooks/use-current-account';
import BigNumber from 'bignumber.js';
import { useAdenaContext } from '@hooks/use-context';
import { useGnoClient } from '@hooks/use-gno-client';

const specialPatternCheck = /\W|\s/g;
const fee = 0.000001;

export const useGeneralSend = () => {
  const { addressBookService } = useAdenaContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [gnoClient] = useGnoClient();
  const [balances] = useWalletBalances(gnoClient);
  const [wallet] = useWallet();
  const { accounts } = useWalletAccounts(wallet);
  const [currentAccount] = useCurrentAccount();
  const [address, setAddress] = useState<string>('');
  const [selectName, setSelectName] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [addressError, setAddressError] = useState<boolean>(false);
  const [amountError, setAmountError] = useState<boolean>(false);
  const [nowAmount, setNowAmount] = useState(BigNumber(0));
  const [isNumber, setIsNumber] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const [accountsList, setAccountsList] = useState<any>([]);

  useEffect(() => {
    (async () => {
      if (accounts && currentAccount) {
        const result = await Promise.all([
          addressBookService.getAddressBookByWalletAccounts(accounts).filter(
            (v) => currentAccount.getAddress() !== v.address,
          ),
          addressBookService.getAddressBook(),
        ]);
        setAccountsList(result.flat());
      }
    })();
  }, []);

  useEffect(() => {
    if (balances.length > 0) {
      try {
        setNowAmount(BigNumber(balances[0]?.amount ?? 0));
      } catch (e) {
        setNowAmount(BigNumber(0));
      }
    }
  }, [balances]);

  useEffect(() => {
    let result = false;
    try {
      if (parseFloat(amount) > 0) {
        result = true;
      }
    } catch (e) {
      result = false;
    }
    setIsNumber(result);
  }, [amount]);

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
      if (charAtZeroCheck.includes('.') && charAtZeroCheck.split('.')[1].length > 6) {
        setAmount(Number(charAtZeroCheck).toFixed(6).toString());
      } else {
        setAmount(charAtZeroCheck);
      }
    },
    [amount],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.key === 'Enter' && Boolean(address) && Boolean(amount)) {
      nextButtonClick();
    }
  };

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

  const availAmount = () => {
    return BigNumber(amount).isLessThanOrEqualTo(nowAmount.minus(fee));
  }

  const maxButtonClick = () => {
    if (nowAmount <= BigNumber(fee)) {
      setAmount('0');
      return;
    }
    setAmount(nowAmount.minus(fee).toFixed(6).toString());
  }

  const nextButtonClick = () => {
    const addressErrorCheck = addressValidationCheck(address);
    const amountErrorCheck = availAmount();
    if (addressErrorCheck && amountErrorCheck)
      navigate(RoutePath.SendConfirm, {
        state: {
          name: selectName,
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

  useEffect(() => {
    function handleClickOutside(e: any) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [wrapperRef]);

  const selectionOpenHandler = () => setIsOpen((prev: boolean) => !prev);
  const selectionClearHandler = () => {
    setSelectName('');
    setAddress('');
    setIsSelected(false);
  };
  const selectAccountClickHandler = (name: string, address: string) => {
    setIsOpen(false);
    setIsSelected(true);
    setAddress(address);
    setSelectName(name);
  };

  return {
    maxClick: maxButtonClick,
    addressState: {
      value: address,
      selectName,
      onChange: addressChange,
      error: addressError,
      errorMessage: addressError ? 'Invalid address' : '',
      wrapperRef,
      isOpen,
      isSelected,
      selectionOpenHandler,
      selectionClearHandler,
      selectAccountClickHandler,
    },
    amountState: {
      value: amount,
      onChange: amountChange,
      error: amountError,
      errorMessage: amountError ? `Insufficient balance` : '',
    },
    buttonState: {
      prev: {
        show: location.state === 'token' ? false : true,
        onClick: prevButtonClick,
      },
      max: maxButtonClick,
      cancel: cancelButtonClick,
      next: nextButtonClick,
      disabled: Boolean(!address || !amount || !isNumber),
    },
    textAreaRef,
    onKeyDown,
    accountsList,
  };
};
