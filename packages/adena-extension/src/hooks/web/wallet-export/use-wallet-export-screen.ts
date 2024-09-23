import { Account } from 'adena-module';
import { useCallback, useEffect, useState } from 'react';

import {
  WALLET_EXPORT_ACCOUNT_ID,
  WALLET_EXPORT_TYPE_STORAGE_KEY,
} from '@common/constants/storage.constant';
import { AdenaStorage } from '@common/storage';
import useAppNavigate from '@hooks/use-app-navigate';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import useIndicatorStep, {
  UseIndicatorStepReturn,
} from '@hooks/wallet/broadcast-transaction/use-indicator-step';
import { useQuery } from '@tanstack/react-query';
import { RoutePath } from '@types';
import useQuestionnaire from '../use-questionnaire';

export type UseWalletExportReturn = {
  currentAccount: Account | null;
  exportType: ExportType;
  walletExportState: WalletExportStateType;
  exportData: string | null;
  indicatorInfo: UseIndicatorStepReturn;
  initWalletExport: () => void;
  backStep: () => void;
  checkPassword: (password: string) => Promise<boolean>;
  moveExport: (password: string) => Promise<void>;
};

export type ExportType = 'PRIVATE_KEY' | 'SEED_PHRASE' | 'NONE';

export type WalletExportStateType = 'INIT' | 'CHECK_PASSWORD' | 'RESULT';

export const walletExportStep: Record<
  WalletExportStateType,
  {
    backTo: WalletExportStateType | null;
    stepNo: number;
  }
> = {
  INIT: {
    backTo: null,
    stepNo: 0,
  },
  CHECK_PASSWORD: {
    backTo: 'INIT',
    stepNo: 0,
  },
  RESULT: {
    backTo: 'INIT',
    stepNo: 0,
  },
};

export const walletExportStepNo: Record<WalletExportStateType, number> = {
  INIT: 0,
  CHECK_PASSWORD: 0,
  RESULT: 0,
};

const useWalletExportScreen = (): UseWalletExportReturn => {
  const { wallet } = useWalletContext();
  const { walletService } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();
  const { ableToSkipQuestionnaire } = useQuestionnaire();
  const [exportType, setExportType] = useState<ExportType>('NONE');
  const { navigate, params } = useAppNavigate<RoutePath.WebWalletExport>();
  const [walletExportState, setWalletExportState] = useState<WalletExportStateType>(
    params?.doneQuestionnaire ? 'CHECK_PASSWORD' : 'INIT',
  );
  const [exportData, setExportData] = useState<string | null>(null);
  const [exportAccountId, setExportAccountId] = useState<string | null>(null);
  const indicatorInfo = useIndicatorStep({
    stepMap: walletExportStepNo,
    currentState: walletExportState,
    hasQuestionnaire: true,
  });

  const { data: account = null } = useQuery(
    ['walletExportScreen/account', exportData, wallet, exportAccountId, currentAccount],
    async () => {
      if (exportData === 'SEED_PHRASE') {
        return currentAccount;
      }
      return wallet?.accounts.find((account) => account.id === exportAccountId) || currentAccount;
    },
    {},
  );

  const _initExportType = useCallback(async () => {
    const sessionStorage = AdenaStorage.session();
    const exportType = await sessionStorage.get(WALLET_EXPORT_TYPE_STORAGE_KEY);
    const exportAccountId = await sessionStorage.get(WALLET_EXPORT_ACCOUNT_ID);
    await sessionStorage.set(WALLET_EXPORT_TYPE_STORAGE_KEY, '');
    await sessionStorage.set(WALLET_EXPORT_ACCOUNT_ID, '');
    switch (exportType) {
      case 'PRIVATE_KEY':
        setExportAccountId(exportAccountId);
        setExportType('PRIVATE_KEY');
        break;
      case 'SEED_PHRASE':
        setExportType('SEED_PHRASE');
        break;
      default:
        location.replace('/register.html');
        break;
    }
  }, []);

  const backStep = useCallback(() => {
    const backState = walletExportStep[walletExportState].backTo;
    if (backState !== null) {
      setWalletExportState(backState);
    }
  }, [walletExportState]);

  const initWalletExport = useCallback(() => {
    if (ableToSkipQuestionnaire) {
      setWalletExportState('CHECK_PASSWORD');
      return;
    }
    navigate(RoutePath.WebQuestionnaire, {
      state: {
        callbackPath: RoutePath.WebWalletExport,
      },
    });
  }, [ableToSkipQuestionnaire]);

  const checkPassword = useCallback(
    async (password: string) => {
      if (exportType === 'NONE') {
        return false;
      }
      return walletService
        .loadWalletPassword()
        .then((storedPassword) => storedPassword === password)
        .catch(() => false);
    },
    [exportType, walletService],
  );

  const moveExport = useCallback(
    async (password: string) => {
      if (exportType === 'NONE' || !account) {
        return;
      }
      const wallet = await walletService.loadWalletWithPassword(password);
      const instance = wallet.clone();
      instance.currentAccountId = account.id;
      if (exportType === 'PRIVATE_KEY') {
        const privateKey = await instance.getPrivateKeyStr();
        setExportData(privateKey);
      } else {
        const seedPhrase = instance.getMnemonic();
        setExportData(seedPhrase);
      }
      setWalletExportState('RESULT');
    },
    [exportType, account, walletService],
  );

  useEffect(() => {
    _initExportType();
  }, []);

  return {
    indicatorInfo,
    currentAccount: account,
    exportType,
    walletExportState,
    exportData,
    backStep,
    initWalletExport,
    checkPassword,
    moveExport,
  };
};

export default useWalletExportScreen;
