import {useCallback, useEffect, useState} from 'react';

import {useWallet} from '../../core/wallet-context';

/**
 * The create and import screens serve two flows: onboarding (a new wallet,
 * a password follows) and adding accounts to an existing wallet.
 */
export type SeedFlowMode = 'onboarding' | 'add';

/**
 * The extension's questionnaire rule: always before the first wallet, and
 * again when the last pass is older than 30 days. `needed` is null while
 * the stored date is read.
 */
export function useQuestionnaireGate(mode: SeedFlowMode): {
  needed: boolean | null;
  passed: () => void;
} {
  const {base} = useWallet();
  const [needed, setNeeded] = useState<boolean | null>(
    mode === 'onboarding' ? true : null,
  );

  useEffect(() => {
    if (mode === 'onboarding') {
      return;
    }
    let cancelled = false;
    base.walletService
      .isSkipQuestionnaire()
      .catch(() => false)
      .then(skip => {
        if (!cancelled) {
          setNeeded(!skip);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [base, mode]);

  const passed = useCallback(() => {
    base.walletService.updateQuestionnaireExpiredDate().catch(() => undefined);
  }, [base]);

  return {needed, passed};
}

/**
 * Step dots of a flow: the warning, the questionnaire when asked, then
 * `rest` (phrase and verify, or the input), then the password on onboarding.
 */
export function flowSteps(
  mode: SeedFlowMode,
  withQuestionnaire: boolean,
  rest: number,
): {total: number; first: number} {
  const first = withQuestionnaire ? 2 : 1;
  return {total: first + rest + (mode === 'onboarding' ? 1 : 0), first};
}
