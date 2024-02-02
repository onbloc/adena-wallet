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
  setInputValue: React.Dispatch<React.SetStateAction<string>>;
  setInputType: React.Dispatch<React.SetStateAction<'12seeds' | '24seeds' | 'pKey'>>;
  step: WalletImportStateType;
  setStep: React.Dispatch<React.SetStateAction<WalletImportStateType>>;
  indicatorInfo: UseIndicatorStepReturn;
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
  const [inputType, setInputType] = useState<'12seeds' | '24seeds' | 'pKey'>('12seeds');
  const errMsg = useMemo(() => {
    if (inputValue) {
      const isSeed = inputType === '12seeds' || inputType === '24seeds';
      if (isSeed && inputValue.trim().split(' ').length > 1) {
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

  const walletImportStepNo = {
    INIT: 0,
    SET_SEED_PHRASE: 1,
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
      let serializedWallet;
      const isSeed = inputType === '12seeds' || inputType === '24seeds';
      const createdWallet = isSeed
        ? await AdenaWallet.createByMnemonic(inputValue)
        : new AdenaWallet();

      if (isSeed) {
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
        state: { serializedWallet, stepLength: indicatorInfo.stepLength },
      });
    }
  }, [step, inputType, inputValue, ableToSkipQuestionnaire]);

  return {
    extended,
    isValidForm,
    errMsg,
    setInputValue,
    setInputType,
    step,
    setStep,
    indicatorInfo,
    onClickGoBack,
    onClickNext,
  };
};

export default useWalletImportScreen;
