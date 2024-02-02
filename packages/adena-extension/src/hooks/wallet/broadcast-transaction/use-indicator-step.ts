import { useWallet } from '@hooks/use-wallet';
import useQuestionnaire from '@hooks/web/use-questionnaire';
import { CommonState } from '@states';
import _ from 'lodash';
import { useEffect, useMemo } from 'react';
import { useRecoilState } from 'recoil';

interface UseIndicatorStepProps<T extends string> {
  stepMap?: Record<T, number>;
  currentState?: T;
  hasQuestionnaire?: boolean;
}

export interface UseIndicatorStepReturn {
  stepNo: number;
  stepLength: number;
}

const useIndicatorStep = <T extends string>({
  stepMap,
  currentState,
  hasQuestionnaire = false,
}: UseIndicatorStepProps<T>): UseIndicatorStepReturn => {
  const { existWallet } = useWallet();
  const { ableToSkipQuestionnaire } = useQuestionnaire();
  const [webHeaderIndicatorLength, setWebHeaderIndicatorLength] = useRecoilState(
    CommonState.webHeaderIndicatorLength,
  );

  if (!stepMap) {
    return {
      stepNo: 0,
      stepLength: webHeaderIndicatorLength,
    };
  }

  const existQuestionnaire = useMemo(() => {
    return hasQuestionnaire && !ableToSkipQuestionnaire;
  }, [hasQuestionnaire, ableToSkipQuestionnaire]);

  const stepLength = useMemo(() => {
    let defaultStepLength = Math.max(..._.values<number>(stepMap)) + 1;
    if (!existWallet) {
      defaultStepLength = defaultStepLength + 1;
    }
    if (existQuestionnaire) {
      defaultStepLength = defaultStepLength + 1;
    }
    return defaultStepLength;
  }, [stepMap, existWallet, existQuestionnaire]);

  const currentStepNo = useMemo(() => {
    if (!currentState) {
      return 0;
    }
    const currentStep = stepMap[currentState] || 0;
    if (currentStep > 0 && existQuestionnaire) {
      return currentStep + 1;
    }
    return currentStep;
  }, [stepMap, currentState, existQuestionnaire]);

  useEffect(() => {
    if (currentStepNo === 0) {
      setWebHeaderIndicatorLength(stepLength);
    }
  }, [currentStepNo, stepLength]);

  return {
    stepNo: currentStepNo,
    stepLength: webHeaderIndicatorLength,
  };
};

export default useIndicatorStep;
