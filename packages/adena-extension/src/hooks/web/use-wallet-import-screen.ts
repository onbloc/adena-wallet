import { useCallback, useMemo, useState } from 'react';
import { AdenaWallet, EnglishMnemonic, PrivateKeyKeyring, SingleAccount } from 'adena-module';

import { RoutePath } from '@types';
import useAppNavigate from '@hooks/use-app-navigate';
import useQuestionnaire from './use-questionnaire';
import useIndicatorStep, {
  UseIndicatorStepReturn,
} from '@hooks/wallet/broadcast-transaction/use-indicator-step';

export type UseWalletImportReturn = {
  isValidForm: boolean;
  extended: boolean;
  errMsg: string;
  updateInputValue: (value: string) => void;
  setInputType: React.Dispatch<React.SetStateAction<'12seeds' | '24seeds' | 'pKey'>>;
  step: WalletImportStateType;
  setStep: React.Dispatch<React.SetStateAction<WalletImportStateType>>;
  indicatorInfo: UseIndicatorStepReturn;
  onClickGoBack: () => void;
  onClickNext: () => void;
};

export type WalletImportStateType = 'INIT' | 'SET_SEED_PHRASE' | 'LOADING';

const useWalletImportScreen = (): UseWalletImportReturn => {
  const { navigate, params } = useAppNavigate<RoutePath.WebWalletImport>();
  const { ableToSkipQuestionnaire } = useQuestionnaire();

  const [step, setStep] = useState<WalletImportStateType>(
    params?.doneQuestionnaire ? 'SET_SEED_PHRASE' : 'INIT',
  );

  const [inputValue, setInputValue] = useState('');
  const [inputType, setInputType] = useState<'12seeds' | '24seeds' | 'pKey'>('12seeds');
  const [errMsg, setErrMsg] = useState('');

  const updateInputValue = useCallback((value: string) => {
    setInputValue(value);
    setErrMsg('');
  }, []);

  const isValidForm = useMemo(() => {
    let validInput = false;
    if (inputType === '12seeds') {
      validInput = inputValue.split(' ').length === 12;
    } else if (inputType === '24seeds') {
      validInput = inputValue.split(' ').length === 24;
    } else {
      validInput = !!inputValue;
    }

    return validInput && !errMsg;
  }, [inputValue, errMsg, inputType]);

  const walletImportStepNo = {
    INIT: 0,
    SET_SEED_PHRASE: 1,
    LOADING: 1,
  };

  const indicatorInfo = useIndicatorStep<string>({
    stepMap: walletImportStepNo,
    currentState: step,
    hasQuestionnaire: true,
  });

  const extended = useMemo(() => {
    return inputType === '24seeds';
  }, [inputType]);

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
      let serializedWallet = '';
      const isSeed = inputType === '12seeds' || inputType === '24seeds';
      let createdWallet = new AdenaWallet();

      if (isSeed) {
        try {
          new EnglishMnemonic(inputValue);
        } catch {
          setErrMsg('Invalid seed phrase');
          return;
        }

        setStep('LOADING');

        createdWallet = await AdenaWallet.createByMnemonic(inputValue);
        serializedWallet = await createdWallet.serialize('');
      } else {
        const keyring = await PrivateKeyKeyring.fromPrivateKeyStr(inputValue).catch(() => null);
        if (keyring === null) {
          setErrMsg('Invalid private key');
          return;
        }

        setStep('LOADING');
        const account = await SingleAccount.createBy(keyring, 'Account');

        createdWallet.currentAccountId = account.id;
        createdWallet.addAccount(account);
        createdWallet.addKeyring(keyring);
        serializedWallet = await createdWallet.serialize('');
      }

      setTimeout(() => {
        navigate(RoutePath.WebCreatePassword, {
          state: { serializedWallet, stepLength: indicatorInfo.stepLength },
          replace: true,
        });
      }, 1000);
    }
  }, [step, inputType, inputValue, ableToSkipQuestionnaire]);

  return {
    extended,
    isValidForm,
    errMsg,
    updateInputValue,
    setInputType,
    step,
    setStep,
    indicatorInfo,
    onClickGoBack,
    onClickNext,
  };
};

export default useWalletImportScreen;
