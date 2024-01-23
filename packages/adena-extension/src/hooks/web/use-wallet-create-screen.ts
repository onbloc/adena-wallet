import useAppNavigate from '@hooks/use-app-navigate';
import { RoutePath } from '@types';
import { useCallback, useState } from 'react';

export type UseWalletCreateReturn = {
  step: WalletCreateStateType;
  setStep: React.Dispatch<React.SetStateAction<WalletCreateStateType>>;
  walletCreateStepNo: {
    INIT: number;
    GET_SEED_PHRASE: number;
  };
  stepLength: number;
  onClickGoBack: () => void;
  onClickNext: () => void;
};

export type WalletCreateStateType = 'INIT' | 'GET_SEED_PHRASE';

const useWalletCreateScreen = (): UseWalletCreateReturn => {
  const { navigate, params } = useAppNavigate<RoutePath.WebWalletCreate>();

  const [step, setStep] = useState<WalletCreateStateType>(
    params?.doneQuestionnaire ? 'GET_SEED_PHRASE' : 'INIT',
  );

  // TODO
  const ableToSkipQuestionnaire = false;

  const stepLength = ableToSkipQuestionnaire ? 3 : 4;
  const walletCreateStepNo = {
    INIT: 0,
    GET_SEED_PHRASE: ableToSkipQuestionnaire ? 1 : 2,
  };

  const onClickGoBack = useCallback(() => {
    if (step === 'INIT') {
      navigate(RoutePath.WebAdvancedOption);
    } else if (step === 'GET_SEED_PHRASE') {
      setStep('INIT');
    }
  }, [step]);

  const onClickNext = useCallback(() => {
    if (step === 'INIT') {
      if (ableToSkipQuestionnaire) {
        setStep('GET_SEED_PHRASE');
      } else {
        navigate(RoutePath.WebQuestionnaire, {
          state: {
            callbackPath: RoutePath.WebWalletCreate,
          },
        });
      }
    } else if (step === 'GET_SEED_PHRASE') {
      navigate(RoutePath.WebCreatePassword, {
        state: {
          serializedWallet: '',
        },
      });
    }
  }, [step, ableToSkipQuestionnaire]);

  return {
    step,
    setStep,
    walletCreateStepNo,
    stepLength,
    onClickGoBack,
    onClickNext,
  };
};

export default useWalletCreateScreen;
