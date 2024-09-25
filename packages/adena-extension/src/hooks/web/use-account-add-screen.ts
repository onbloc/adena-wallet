import { isHDWalletKeyring, SeedAccount } from 'adena-module';
import { useCallback, useMemo, useState } from 'react';

import { waitForRun } from '@common/utils/timeout-utils';
import useAppNavigate from '@hooks/use-app-navigate';
import { useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import useIndicatorStep, {
  UseIndicatorStepReturn,
} from '@hooks/wallet/broadcast-transaction/use-indicator-step';
import { RoutePath } from '@types';
import useQuestionnaire from './use-questionnaire';

interface KeyringInfo {
  index: number;
  keyringId: string;
  accountCount: number;
}

export type UseAccountAddScreenReturn = {
  indicatorInfo: UseIndicatorStepReturn;
  step: AccountAddStateType;
  keyringInfos: KeyringInfo[];
  setStep: React.Dispatch<React.SetStateAction<AccountAddStateType>>;
  addAccount: (keyringId?: string) => Promise<void>;
  onClickGoBack: () => void;
  onClickNext: () => void;
};

export type AccountAddStateType = 'INIT' | 'SELECT_SEED_PHRASE' | 'CREATE_ACCOUNT';

const useAccountAddScreen = (): UseAccountAddScreenReturn => {
  const { navigate, params } = useAppNavigate<RoutePath.WebAccountAdd>();
  const { ableToSkipQuestionnaire } = useQuestionnaire();
  const { wallet, updateWallet } = useWalletContext();
  const { changeCurrentAccount } = useCurrentAccount();

  const hasMultiSeedPhrase = useMemo(() => {
    if (!wallet) {
      return false;
    }
    return wallet.keyrings.filter(isHDWalletKeyring).length > 1;
  }, [wallet]);

  const [step, setStep] = useState<AccountAddStateType>(
    params?.doneQuestionnaire
      ? hasMultiSeedPhrase
        ? 'CREATE_ACCOUNT'
        : 'SELECT_SEED_PHRASE'
      : 'INIT',
  );

  const accountAddStepNo = hasMultiSeedPhrase
    ? {
        INIT: 0,
        SELECT_SEED_PHRASE: 1,
      }
    : {
        INIT: 0,
        SELECT_SEED_PHRASE: 0,
      };

  const indicatorInfo = useIndicatorStep<string>({
    stepMap: accountAddStepNo,
    currentState: step,
    hasQuestionnaire: true,
  });

  const keyringInfos = useMemo(() => {
    if (!wallet) {
      return [];
    }

    const accounts = wallet.accounts;

    return wallet.keyrings.filter(isHDWalletKeyring).map((keyring, index) => ({
      index,
      keyringId: keyring.id,
      accountCount: accounts.filter((account) => account.keyringId === keyring.id).length,
    }));
  }, [wallet]);

  const onClickGoBack = useCallback(() => {
    switch (step) {
      case 'INIT':
        navigate(RoutePath.WebAdvancedOption);
        break;
      case 'SELECT_SEED_PHRASE':
      case 'CREATE_ACCOUNT':
        setStep('INIT');
        break;
      default:
        break;
    }
  }, [step]);

  const onClickNext = useCallback(async () => {
    if (step === 'INIT') {
      if (!ableToSkipQuestionnaire) {
        navigate(RoutePath.WebQuestionnaire, {
          state: {
            callbackPath: RoutePath.WebAccountAdd,
          },
        });
        return;
      }

      if (hasMultiSeedPhrase) {
        setStep('SELECT_SEED_PHRASE');
        return;
      }

      setStep('CREATE_ACCOUNT');
    } else if (step === 'SELECT_SEED_PHRASE') {
      setStep('CREATE_ACCOUNT');
    }
  }, [step, ableToSkipQuestionnaire]);

  const addAccount = async (keyringId?: string): Promise<void> => {
    const currentKeyringId = keyringId || wallet?.keyrings.find(isHDWalletKeyring)?.id;
    if (!currentKeyringId) {
      navigate(RoutePath.WebNotFound);
      return;
    }

    const succeed = await waitForRun<boolean>(async () => _addAccount(currentKeyringId));
    if (succeed) {
      navigate(RoutePath.WebAccountAddedComplete);
    } else {
      navigate(RoutePath.WebNotFound);
    }
  };

  const _addAccount = async (keyringId: string): Promise<boolean> => {
    try {
      if (!wallet) {
        return false;
      }

      const hdWalletKeyring = wallet.keyrings.find(
        (keyring) => keyring.id === keyringId && isHDWalletKeyring(keyring),
      );
      if (!hdWalletKeyring) {
        return false;
      }

      const index = wallet.getNextAccountIndexBy(hdWalletKeyring);
      const hdPath = wallet.getNextHDPathBy(hdWalletKeyring);
      const accountNumber = wallet.getNextAccountNumberBy(hdWalletKeyring);
      const name = `Account ${accountNumber}`;

      const account = await SeedAccount.createBy(hdWalletKeyring, name, hdPath, index);

      const clone = wallet.clone();
      clone.addAccount(account);

      const storedAccount = clone.accounts.find((storedAccount) => storedAccount.id === account.id);
      if (storedAccount) {
        await changeCurrentAccount(storedAccount);
      }
      await updateWallet(clone);
      return true;
    } catch (error) {
      return false;
    }
  };

  return {
    indicatorInfo,
    step,
    keyringInfos,
    setStep,
    onClickGoBack,
    onClickNext,
    addAccount,
  };
};

export default useAccountAddScreen;
