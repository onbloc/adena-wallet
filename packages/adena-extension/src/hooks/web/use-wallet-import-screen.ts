import {
  AdenaWallet,
  EnglishMnemonic,
  Keyring,
  PrivateKeyKeyring,
  SingleAccount,
} from 'adena-module';
import { useCallback, useMemo, useState } from 'react';

import { waitForRun } from '@common/utils/timeout-utils';
import { isSeedPhraseString } from '@common/validation';
import useAppNavigate from '@hooks/use-app-navigate';
import useIndicatorStep, {
  UseIndicatorStepReturn,
} from '@hooks/wallet/broadcast-transaction/use-indicator-step';
import { ImportWalletType, RoutePath } from '@types';

import { stringFromBase64, stringToBase64 } from '@common/utils/encoding-util';
import useQuestionnaire from './use-questionnaire';

export type UseWalletImportReturn = {
  isValidForm: boolean;
  extended: boolean;
  errMsg: string;
  updateInputValue: (value: string) => void;
  setInputType: React.Dispatch<React.SetStateAction<ImportWalletType>>;
  step: WalletImportStateType;
  setStep: React.Dispatch<React.SetStateAction<WalletImportStateType>>;
  indicatorInfo: UseIndicatorStepReturn;
  onClickGoBack: () => void;
  onClickNext: () => void;
};

export type WalletImportStateType = 'INIT' | 'SET_SEED_PHRASE' | 'LOADING';

const isValidMnemonic = (mnemonic: string): boolean => {
  try {
    new EnglishMnemonic(mnemonic);
  } catch {
    return false;
  }
  return true;
};

const createSerializedWalletWithMnemonic = (mnemonic: string): Promise<string | null> => {
  return waitForRun<string>(async () => {
    const createdWallet = await AdenaWallet.createByMnemonic(mnemonic);
    const serializedWallet = await createdWallet.serialize('');
    return serializedWallet;
  }).catch(() => null);
};

const createSerializedWalletWithPrivateKeyKeyring = (keyring: Keyring): Promise<string | null> => {
  return waitForRun<string>(async () => {
    const account = await SingleAccount.createBy(keyring, 'Account');
    const createdWallet = await new AdenaWallet();
    createdWallet.currentAccountId = account.id;
    createdWallet.addAccount(account);
    createdWallet.addKeyring(keyring);

    const serializedWallet = await createdWallet.serialize('');
    return serializedWallet;
  }).catch(() => null);
};

const useWalletImportScreen = (): UseWalletImportReturn => {
  const { navigate, params } = useAppNavigate<RoutePath.WebWalletImport>();
  const { ableToSkipQuestionnaire } = useQuestionnaire();

  const [step, setStep] = useState<WalletImportStateType>(
    params?.doneQuestionnaire ? 'SET_SEED_PHRASE' : 'INIT',
  );

  const [inputValue, setInputValue] = useState('');
  const [inputType, setInputType] = useState<ImportWalletType>('12seeds');
  const [errMsg, setErrMsg] = useState('');

  const decodedInputValue = useMemo(() => {
    return stringFromBase64(inputValue);
  }, [inputValue]);

  const updateInputValue = useCallback((value: string) => {
    setInputValue(stringToBase64(value));
    setErrMsg('');
  }, []);

  const isValidForm = useMemo(() => {
    let validInput = false;
    if (inputType === '12seeds') {
      validInput = isSeedPhraseString(decodedInputValue, 12);
    } else if (inputType === '24seeds') {
      validInput = isSeedPhraseString(decodedInputValue, 24);
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
      let serializedWallet: string | null = '';

      const isSeed = inputType === '12seeds' || inputType === '24seeds';
      if (isSeed) {
        if (!isValidMnemonic(decodedInputValue)) {
          setErrMsg('Invalid seed phrase');
          return;
        }

        setStep('LOADING');
        serializedWallet = await createSerializedWalletWithMnemonic(decodedInputValue);
        setInputValue('');
      } else {
        let keyring = await PrivateKeyKeyring.fromPrivateKeyStr(decodedInputValue).catch(
          () => null,
        );
        if (keyring === null) {
          setErrMsg('Invalid private key');
          return;
        }

        setStep('LOADING');
        serializedWallet = await createSerializedWalletWithPrivateKeyKeyring(keyring);
        keyring = null;
        setInputValue('');
      }

      if (!serializedWallet) {
        navigate(RoutePath.WebNotFound);
        return;
      }

      navigate(RoutePath.WebCreatePassword, {
        state: { serializedWallet, stepLength: indicatorInfo.stepLength },
        replace: true,
      });
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
