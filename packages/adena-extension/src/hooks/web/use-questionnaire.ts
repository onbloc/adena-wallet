import { useQuery } from '@tanstack/react-query';

import { useAdenaContext } from '@hooks/use-context';

export type UseQuestionnaireReturn = {
  ableToSkipQuestionnaire: boolean;
  isQuestionnaireLoading: boolean;
  doneQuestionnaire: () => Promise<void>;
};

const useQuestionnaire = (): UseQuestionnaireReturn => {
  const { walletService } = useAdenaContext();

  const { data: ableToSkipQuestionnaire = false, isLoading: isQuestionnaireLoading } = useQuery(
    ['questionnaire', walletService],
    async () => {
      const existWallet = await walletService.existsWallet();
      if (!existWallet) {
        return false;
      }
      const ableToSkipQuestionnaire = await walletService.isSkipQuestionnaire().catch(() => false);
      return ableToSkipQuestionnaire;
    },
    {},
  );

  const doneQuestionnaire = (): Promise<void> => {
    return walletService.updateQuestionnaireExpiredDate();
  };

  return {
    ableToSkipQuestionnaire,
    isQuestionnaireLoading,
    doneQuestionnaire,
  };
};

export default useQuestionnaire;
