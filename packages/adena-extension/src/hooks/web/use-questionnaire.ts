import { useQuery } from '@tanstack/react-query';

import { useAdenaContext } from '@hooks/use-context';

export type UseQuestionnaireReturn = {
  ableToSkipQuestionnaire: boolean;
  doneQuestionnaire: () => Promise<void>;
};

const useQuestionnaire = (): UseQuestionnaireReturn => {
  const { walletService } = useAdenaContext();

  const { data: ableToSkipQuestionnaire = false } = useQuery(
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
    doneQuestionnaire,
  };
};

export default useQuestionnaire;
