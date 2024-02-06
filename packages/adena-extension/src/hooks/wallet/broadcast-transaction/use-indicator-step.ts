import { useEffect, useMemo } from 'react';
import { useRecoilState } from 'recoil';
import _ from 'lodash';
import { useQuery } from '@tanstack/react-query';

import { useAdenaContext } from '@hooks/use-context';
import useQuestionnaire from '@hooks/web/use-questionnaire';
import { CommonState } from '@states';

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
  const { walletService } = useAdenaContext();
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

  const { data: stepLength = 0 } = useQuery<number>(
    ['stepLength', hasQuestionnaire, stepMap, walletService],
    async () => {
      let defaultStepLength = Math.max(..._.values<number>(stepMap)) + 1;
      const existWallet = await walletService.existsWallet().catch(() => false);
      if (!existWallet) {
        defaultStepLength = defaultStepLength + 1;
      }
      if (hasQuestionnaire) {
        if (!existWallet) {
          defaultStepLength = defaultStepLength + 1;
        } else {
          const ableToSkipQuestionnaire = await walletService
            .isSkipQuestionnaire()
            .catch(() => false);
          if (!ableToSkipQuestionnaire) {
            defaultStepLength = defaultStepLength + 1;
          }
        }
      }
      return defaultStepLength;
    },
  );

  const existQuestionnaire = useMemo(() => {
    return hasQuestionnaire && !ableToSkipQuestionnaire;
  }, [hasQuestionnaire, ableToSkipQuestionnaire]);

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
