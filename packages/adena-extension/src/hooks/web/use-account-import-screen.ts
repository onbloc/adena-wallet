import { useCallback, useMemo, useState } from 'react';
import {
  Wallet,
  PrivateKeyKeyring,
  SingleAccount,
  Account,
  Keyring,
  isAirgapAccount,
} from 'adena-module';

import { RoutePath } from '@types';
import useAppNavigate from '@hooks/use-app-navigate';
import { useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import useQuestionnaire from './use-questionnaire';
import { defaultAddressPrefix } from '@gnolang/tm2-js-client';

export type UseAccountImportReturn = {
  isValidForm: boolean;
  errMsg: string;
  privateKey: string;
  setPrivateKey: (privateKey: string) => void;
  step: AccountImportStateType;
  setStep: React.Dispatch<React.SetStateAction<AccountImportStateType>>;
  accountImportStepNo: {
    INIT: number;
    SET_PRIVATE_KEY: number;
    LOADING: number;
  };
  stepLength: number;
  onClickGoBack: () => void;
  onClickNext: () => void;
};

export type AccountImportStateType = 'INIT' | 'SET_PRIVATE_KEY' | 'LOADING';

const useAccountImportScreen = ({ wallet }: { wallet: Wallet }): UseAccountImportReturn => {
  const { navigate, params } = useAppNavigate<RoutePath.WebAccountImport>();
  const { ableToSkipQuestionnaire } = useQuestionnaire();
  const { updateWallet } = useWalletContext();
  const { changeCurrentAccount } = useCurrentAccount();

  const [step, setStep] = useState<AccountImportStateType>(
    params?.doneQuestionnaire ? 'SET_PRIVATE_KEY' : 'INIT',
  );

  const [privateKey, setPrivateKey] = useState('');
  const [errMsg, setErrMsg] = useState('');

  const stepLength = ableToSkipQuestionnaire ? 3 : 4;
  const accountImportStepNo = {
    INIT: 0,
    SET_PRIVATE_KEY: ableToSkipQuestionnaire ? 1 : 2,
    LOADING: ableToSkipQuestionnaire ? 1 : 2,
  };

  const isValidForm = useMemo(() => {
    return !!privateKey || !errMsg;
  }, [privateKey]);

  const changePrivateKey = useCallback((privateKey: string) => {
    setErrMsg('');
    setPrivateKey(privateKey);
  }, []);

  const makePrivateKeyAccountAndKeyring = useCallback(async (): Promise<{
    account: Account;
    keyring: Keyring;
  } | null> => {
    setErrMsg('');
    if (!privateKey) {
      return null;
    }

    const keyring = await PrivateKeyKeyring.fromPrivateKeyStr(privateKey).catch(() => null);
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
  }, [wallet, privateKey]);

  const onClickGoBack = useCallback(() => {
    if (step === 'INIT') {
      navigate(RoutePath.WebAdvancedOption);
    } else if (step === 'SET_PRIVATE_KEY') {
      setStep('INIT');
    }
  }, [step]);

  const onClickNext = useCallback(async () => {
    if (step === 'INIT') {
      if (ableToSkipQuestionnaire) {
        setStep('SET_PRIVATE_KEY');
      } else {
        navigate(RoutePath.WebQuestionnaire, {
          state: {
            callbackPath: RoutePath.WebAccountImport,
          },
        });
      }
    } else if (step === 'SET_PRIVATE_KEY') {
      const result = await makePrivateKeyAccountAndKeyring();
      if (!result) {
        return;
      }
      setStep('LOADING');
      const { account, keyring } = result;
      account.index = wallet.lastAccountIndex + 1;
      account.name = `Account ${account.index}`;
      const clone = wallet.clone();
      clone.addAccount(account);
      clone.addKeyring(keyring);
      const storedAccount = clone.accounts.find((storedAccount) => storedAccount.id === account.id);
      if (storedAccount) {
        await changeCurrentAccount(storedAccount);
      }
      await updateWallet(clone);
      navigate(RoutePath.WebAccountAddedComplete);
    }
  }, [step, privateKey, ableToSkipQuestionnaire, makePrivateKeyAccountAndKeyring]);

  return {
    isValidForm,
    errMsg,
    privateKey,
    setPrivateKey: changePrivateKey,
    step,
    setStep,
    accountImportStepNo,
    stepLength,
    onClickGoBack,
    onClickNext,
  };
};

export default useAccountImportScreen;
