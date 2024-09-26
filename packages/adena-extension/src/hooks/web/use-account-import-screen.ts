import {
  Account,
  AdenaWallet,
  HDWalletKeyring,
  isAirgapAccount,
  isHDWalletKeyring,
  Keyring,
  PrivateKeyKeyring,
  SeedAccount,
  SingleAccount,
  Wallet,
} from 'adena-module';
import { useCallback, useMemo, useState } from 'react';

import { waitForRun } from '@common/utils/timeout-utils';
import { defaultAddressPrefix } from '@gnolang/tm2-js-client';
import useAppNavigate from '@hooks/use-app-navigate';
import { useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useWallet } from '@hooks/use-wallet';
import useIndicatorStep, {
  UseIndicatorStepReturn,
} from '@hooks/wallet/broadcast-transaction/use-indicator-step';
import { ImportWalletType, RoutePath } from '@types';
import useQuestionnaire from './use-questionnaire';

export type UseAccountImportReturn = {
  indicatorInfo: UseIndicatorStepReturn;
  isValidForm: boolean;
  isLoadingAccounts: boolean;
  storedAccounts: Account[];
  loadedAccounts: Account[];
  loadAccounts: () => Promise<void>;
  selectedAddresses: string[];
  selectAccount: (address: string) => void;
  errMsg: string;
  inputValue: string;
  updateInputValue: (inputValue: string) => void;
  inputType: ImportWalletType;
  setInputType: (inputType: ImportWalletType) => void;
  step: AccountImportStateType;
  setStep: React.Dispatch<React.SetStateAction<AccountImportStateType>>;
  accountImportStepNo:
    | {
        INIT: number;
        SET_MNEMONIC: number;
        LOADING: number;
      }
    | {
        INIT: number;
        SET_MNEMONIC: number;
        LOADING: number;
        SELECT_ACCOUNT: number;
      };
  stepLength: number;
  onClickGoBack: () => void;
  onClickNext: () => void;
};

export type AccountImportStateType = 'INIT' | 'SET_MNEMONIC' | 'LOADING' | 'SELECT_ACCOUNT';

const useAccountImportScreen = ({ wallet }: { wallet: Wallet }): UseAccountImportReturn => {
  const { navigate, params } = useAppNavigate<RoutePath.WebAccountImport>();
  const { ableToSkipQuestionnaire } = useQuestionnaire();
  const { updateWallet } = useWalletContext();
  const { changeCurrentAccount } = useCurrentAccount();
  const { hasHDWallet } = useWallet();

  const [inputType, setInputType] = useState<ImportWalletType>('12seeds');
  const [step, setStep] = useState<AccountImportStateType>(
    params?.doneQuestionnaire ? 'SET_MNEMONIC' : 'INIT',
  );
  const [selectedAddresses, setSelectedAddresses] = useState<string[]>([]);
  const [loadedAccounts, setLoadedAccounts] = useState<Account[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState<boolean>(false);
  const [generatedKeyring, setGeneratedKeyring] = useState<Keyring | null>(null);

  const [inputValue, setInputValue] = useState('');
  const [errMsg, setErrMsg] = useState('');

  const stepLength = ableToSkipQuestionnaire ? 3 : 4;
  const accountImportStepNo = {
    INIT: 0,
    SET_MNEMONIC: ableToSkipQuestionnaire ? 1 : 2,
    LOADING: ableToSkipQuestionnaire ? 1 : 2,
  };

  const accountImportStepNoOfMultiHDWallet = {
    INIT: 0,
    SET_MNEMONIC: ableToSkipQuestionnaire ? 1 : 2,
    LOADING: ableToSkipQuestionnaire ? 1 : 2,
    SELECT_ACCOUNT: ableToSkipQuestionnaire ? 2 : 3,
  };

  const indicatorInfo = useIndicatorStep<string>({
    stepMap: hasHDWallet ? accountImportStepNoOfMultiHDWallet : accountImportStepNo,
    currentState: step,
    hasQuestionnaire: true,
  });

  const isValidForm = useMemo(() => {
    return !!inputValue && !errMsg;
  }, [inputValue, errMsg]);

  const storedAccounts = useMemo(() => {
    return wallet.accounts;
  }, [wallet.accounts]);

  const updateInputValue = useCallback((inputValue: string) => {
    setErrMsg('');
    setInputValue(inputValue);
  }, []);

  const selectAccount = (selectedAddress: string): void => {
    if (selectedAddresses.includes(selectedAddress)) {
      setSelectedAddresses((prev) => prev.filter((address) => address !== selectedAddress));
      return;
    }
    setSelectedAddresses((prev) => [...prev, selectedAddress]);
  };

  const makePrivateKeyAccountAndKeyring = useCallback(async (): Promise<{
    account: Account;
    keyring: Keyring;
  } | null> => {
    setErrMsg('');
    if (!inputValue) {
      return null;
    }

    const keyring = await PrivateKeyKeyring.fromPrivateKeyStr(inputValue).catch(() => null);
    if (keyring === null) {
      setErrMsg('Invalid private key');
      return null;
    }

    const account = await SingleAccount.createBy(keyring, wallet.nextAccountName);
    const address = await account.getAddress(defaultAddressPrefix);
    const checkAccounts = wallet.accounts.filter((account) => !isAirgapAccount(account));
    const storedAddresses = await Promise.all(
      checkAccounts.map((account) => account.getAddress(defaultAddressPrefix)),
    );
    const existAddress = storedAddresses.includes(address);
    if (existAddress) {
      setErrMsg('Private key already registered');
      return null;
    }
    return { account, keyring };
  }, [wallet, inputValue]);

  const onClickGoBack = useCallback(() => {
    switch (step) {
      case 'INIT':
        navigate(RoutePath.WebAdvancedOption);
        break;
      case 'SET_MNEMONIC':
        setStep('INIT');
        break;
      case 'SELECT_ACCOUNT':
        setStep('SET_MNEMONIC');
        break;
      default:
        break;
    }
  }, [step]);

  const onClickNext = useCallback(async () => {
    if (step === 'INIT') {
      if (ableToSkipQuestionnaire) {
        setStep('SET_MNEMONIC');
      } else {
        navigate(RoutePath.WebQuestionnaire, {
          state: {
            callbackPath: RoutePath.WebAccountImport,
          },
        });
      }
    } else if (step === 'SET_MNEMONIC') {
      if (inputType === 'pKey') {
        const result = await makePrivateKeyAccountAndKeyring();
        if (!result) {
          return;
        }
        setStep('LOADING');

        await waitForRun(async () => {
          const { account, keyring } = result;
          const resultWallet = await addAccountWith(wallet.clone(), keyring, account);
          await updateWallet(resultWallet);
        }).then(() => navigate(RoutePath.WebAccountAddedComplete));
        return;
      } else {
        setStep('LOADING');

        await waitForRun(async () => {
          const keyring = await HDWalletKeyring.fromMnemonic(inputValue);

          setGeneratedKeyring(keyring);
          await loadAccountsByKeyring(keyring);
        }).then(() => {
          setStep('SELECT_ACCOUNT');
        });
      }
    } else if (step === 'SELECT_ACCOUNT') {
      let resultWallet = wallet.clone();

      const storedKeyring = resultWallet.keyrings
        .filter(isHDWalletKeyring)
        .find((keyring) => keyring.mnemonic === inputValue.trim());
      const keyring = storedKeyring || (await HDWalletKeyring.fromMnemonic(inputValue));

      for (const account of loadedAccounts) {
        const address = await account.getAddress('g');
        if (selectedAddresses.includes(address)) {
          resultWallet = await addAccountWith(resultWallet, keyring, account);
        }
      }

      await updateWallet(resultWallet);
      navigate(RoutePath.WebAccountAddedComplete);
    }
  }, [
    step,
    wallet,
    inputType,
    inputValue,
    selectedAddresses,
    loadedAccounts,
    ableToSkipQuestionnaire,
    makePrivateKeyAccountAndKeyring,
  ]);

  const loadAccounts = async (): Promise<void> => {
    if (!generatedKeyring) {
      return;
    }
    await loadAccountsByKeyring(generatedKeyring);
  };

  const loadAccountsByKeyring = async (keyring: Keyring): Promise<void> => {
    setIsLoadingAccounts(true);
    await waitForRun(async () => {
      const startIndex = loadedAccounts.length;
      const range = Array.from({ length: 5 }, (_, index) => index + startIndex);

      const accounts: Account[] = [];
      for (const hdPath of range) {
        const account = await SeedAccount.createBy(keyring, 'Account', hdPath, hdPath);
        accounts.push(account);
      }

      return accounts;
    }).then((accounts) => {
      setIsLoadingAccounts(false);
      setLoadedAccounts([...loadedAccounts, ...accounts]);
    });
  };

  const addAccountWith = async (
    wallet: AdenaWallet,
    keyring: Keyring,
    account: Account,
  ): Promise<AdenaWallet> => {
    const index = wallet.getNextAccountIndexBy(keyring);
    const accountNumber = wallet.getNextAccountNumberBy(keyring);
    const name = `Account ${accountNumber}`;

    account.index = index;
    account.name = name;
    account.keyringId = keyring.id;

    const clone = wallet.clone();
    clone.addAccount(account);
    clone.addKeyring(keyring);

    const storedAccount = clone.accounts.find((storedAccount) => storedAccount.id === account.id);

    if (storedAccount) {
      await changeCurrentAccount(storedAccount);
    }

    return clone;
  };

  return {
    indicatorInfo,
    isValidForm,
    isLoadingAccounts,
    errMsg,
    inputValue,
    storedAccounts,
    updateInputValue,
    inputType,
    setInputType,
    step,
    setStep,
    accountImportStepNo,
    stepLength,
    selectedAddresses,
    selectAccount,
    loadedAccounts,
    loadAccounts,
    onClickGoBack,
    onClickNext,
  };
};

export default useAccountImportScreen;
