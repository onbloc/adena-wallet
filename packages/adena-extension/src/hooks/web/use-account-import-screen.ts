import { useCallback, useState } from 'react';
import { Wallet, PrivateKeyKeyring, SingleAccount } from 'adena-module';

import { RoutePath } from '@types';
import useAppNavigate from '@hooks/use-app-navigate';
import { useQuery } from '@tanstack/react-query';
import { useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import useQuestionnaire from './use-questionnaire';

export type UseAccountImportReturn = {
  isValidForm: boolean;
  errMsg: string;
  privateKey: string;
  setPrivateKey: React.Dispatch<React.SetStateAction<string>>;
  step: AccountImportStateType;
  setStep: React.Dispatch<React.SetStateAction<AccountImportStateType>>;
  accountImportStepNo: {
    INIT: number;
    SET_PRIVATE_KEY: number;
  };
  stepLength: number;
  onClickGoBack: () => void;
  onClickNext: () => void;
};

export type AccountImportStateType = 'INIT' | 'SET_PRIVATE_KEY';

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

  const { data: keyring } = useQuery(
    ['keyring', privateKey],
    async () => {
      setErrMsg('');
      if (privateKey) {
        const _privateKey = privateKey.replace('0x', '');
        const regExp = /[0-9A-Fa-f]{64}/g;
        if (_privateKey.length !== 64 || !_privateKey.match(regExp)) {
          setErrMsg('Invalid private key');
          return;
        }
        const _keyring = await PrivateKeyKeyring.fromPrivateKeyStr(privateKey);
        const account = await SingleAccount.createBy(_keyring, wallet.nextAccountName);
        const storedAccount = wallet.accounts.find(
          (_account) => JSON.stringify(_account.publicKey) === JSON.stringify(account.publicKey),
        );
        if (storedAccount) {
          setErrMsg('Private key already registered');
          return;
        }

        return _keyring;
      }
    },
    {
      enabled: !!privateKey,
    },
  );

  const isValidForm = !!privateKey && !!keyring && !errMsg;

  const stepLength = ableToSkipQuestionnaire ? 3 : 4;
  const accountImportStepNo = {
    INIT: 0,
    SET_PRIVATE_KEY: ableToSkipQuestionnaire ? 1 : 2,
  };

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
    } else if (step === 'SET_PRIVATE_KEY' && keyring) {
      const account = await SingleAccount.createBy(keyring, wallet.nextAccountName);

      account.index = wallet.lastAccountIndex + 1;
      account.name = `Account ${account.index}`;
      const clone = wallet.clone();
      clone.addAccount(account);
      clone.addKeyring(keyring);

      await updateWallet(clone);
      await changeCurrentAccount(account);
      navigate(RoutePath.WebAccountAddedComplete);
    }
  }, [step, privateKey, ableToSkipQuestionnaire, keyring]);

  return {
    isValidForm,
    errMsg,
    privateKey,
    setPrivateKey,
    step,
    setStep,
    accountImportStepNo,
    stepLength,
    onClickGoBack,
    onClickNext,
  };
};

export default useAccountImportScreen;
