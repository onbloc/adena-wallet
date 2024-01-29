import { useCallback, useMemo, useState } from 'react';
import { AdenaWallet, EnglishMnemonic, PrivateKeyKeyring, SingleAccount } from 'adena-module';

import { RoutePath } from '@types';
import useAppNavigate from '@hooks/use-app-navigate';
import useQuestionnaire from './use-questionnaire';

export type UseWalletImportReturn = {
  isValidForm: boolean;
  errMsg: string;
  setInputValue: React.Dispatch<React.SetStateAction<string>>;
  setInputType: React.Dispatch<React.SetStateAction<'seed' | 'pKey'>>;
  step: WalletImportStateType;
  setStep: React.Dispatch<React.SetStateAction<WalletImportStateType>>;
  walletImportStepNo: {
    INIT: number;
    SET_SEED_PHRASE: number;
  };
  stepLength: number;
  onClickGoBack: () => void;
  onClickNext: () => void;
};

export type WalletImportStateType = 'INIT' | 'SET_SEED_PHRASE';

const useWalletImportScreen = (): UseWalletImportReturn => {
  const { navigate, params } = useAppNavigate<RoutePath.WebWalletImport>();
  const { ableToSkipQuestionnaire } = useQuestionnaire();

  const [step, setStep] = useState<WalletImportStateType>(
    params?.doneQuestionnaire ? 'SET_SEED_PHRASE' : 'INIT',
  );

  const [inputValue, setInputValue] = useState('');
  const [inputType, setInputType] = useState<'seed' | 'pKey'>('seed');
  const errMsg = useMemo(() => {
    if (inputValue) {
      if (inputType === 'seed' && inputValue.trim().split(' ').length > 1) {
        try {
          new EnglishMnemonic(inputValue);
        } catch {
          return 'Invalid seed phrase';
        }
      } else if (inputType === 'pKey') {
        const privateKey = inputValue.replace('0x', '');
        const regExp = /[0-9A-Fa-f]{64}/g;
        if (privateKey.length !== 64 || !privateKey.match(regExp)) {
          return 'Invalid private key';
        }
      }
    }
    return '';
  }, [inputValue, inputType]);

  const isValidForm = !!inputValue && !errMsg;

  const stepLength = ableToSkipQuestionnaire ? 3 : 4;
  const walletImportStepNo = {
    INIT: 0,
    SET_SEED_PHRASE: ableToSkipQuestionnaire ? 1 : 2,
  };

  const onClickGoBack = useCallback(() => {
    if (step === 'INIT') {
      navigate(RoutePath.WebAdvancedOption);
    } else if (step === 'SET_SEED_PHRASE') {
      setStep('INIT');
    }
  }, [step]);

  const onClickNext = useCallback(async () => {
    if (step === 'INIT') {
      if (ableToSkipQuestionnaire) {
        setStep('SET_SEED_PHRASE');
      } else {
        navigate(RoutePath.WebQuestionnaire, {
          state: {
            callbackPath: RoutePath.WebWalletImport,
          },
        });
      }
    } else if (step === 'SET_SEED_PHRASE') {
      let serializedWallet;
      const createdWallet =
        inputType === 'seed' ? await AdenaWallet.createByMnemonic(inputValue) : new AdenaWallet();

      if (inputType === 'seed') {
        serializedWallet = await createdWallet.serialize('');
      } else {
        const keyring = await PrivateKeyKeyring.fromPrivateKeyStr(inputValue);
        const account = await SingleAccount.createBy(keyring, 'Account');
        createdWallet.currentAccountId = account.id;
        createdWallet.addAccount(account);
        createdWallet.addKeyring(keyring);
        serializedWallet = await createdWallet.serialize('');
      }

      navigate(RoutePath.WebCreatePassword, {
        state: { serializedWallet, stepLength },
      });
    }
  }, [step, inputType, inputValue, ableToSkipQuestionnaire]);

  return {
    isValidForm,
    errMsg,
    setInputValue,
    setInputType,
    step,
    setStep,
    walletImportStepNo,
    stepLength,
    onClickGoBack,
    onClickNext,
  };
};

export default useWalletImportScreen;
