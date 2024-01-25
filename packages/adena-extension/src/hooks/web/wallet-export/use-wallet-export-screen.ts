import { useCallback, useEffect, useState } from 'react';
import { Account } from 'adena-module';

import useAppNavigate from '@hooks/use-app-navigate';
import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { RoutePath } from '@types';
import { AdenaStorage } from '@common/storage';
import { WALLET_EXPORT_TYPE_STORAGE_KEY } from '@common/constants/storage.constant';

export type UseWalletExportReturn = {
  currentAccount: Account | null;
  exportType: ExportType;
  walletExportState: WalletExportStateType;
  exportData: string | null;
  backStep: () => void;
  initWalletExport: () => void;
  checkPassword: (password: string) => Promise<boolean>;
  moveExport: (password: string) => Promise<void>;
};

export type ExportType = 'PRIVATE_KEY' | 'SEED_PHRASE' | 'NONE';

export type WalletExportStateType = 'INIT' | 'CHECK_PASSWORD' | 'RESULT';

const useWalletExportScreen = (): UseWalletExportReturn => {
  const { currentAccount } = useCurrentAccount();
  const { walletService } = useAdenaContext();
  const [exportType, setExportType] = useState<ExportType>('NONE');
  const { navigate, params } = useAppNavigate<RoutePath.WebWalletExport>();
  const [walletExportState, setWalletExportState] = useState<WalletExportStateType>(
    params?.doneQuestionnaire ? 'CHECK_PASSWORD' : 'INIT',
  );
  const [exportData, setExportData] = useState<string | null>(null);

  // TODO
  const ableToSkipQuestionnaire = false;

  const _initExportType = useCallback(async () => {
    const sessionStorage = AdenaStorage.session();
    const exportType = await sessionStorage.get(WALLET_EXPORT_TYPE_STORAGE_KEY);
    switch (exportType) {
      case 'PRIVATE_KEY':
        setExportType('PRIVATE_KEY');
        break;
      case 'SEED_PHRASE':
        setExportType('SEED_PHRASE');
        break;
      default:
        navigate(RoutePath.Home);
        break;
    }
  }, []);

  const backStep = useCallback(() => {
    if (walletExportState === 'INIT') {
      navigate(RoutePath.WebAdvancedOption);
      return;
    }
    setWalletExportState('CHECK_PASSWORD');
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
      if (exportType === 'NONE' || !currentAccount) {
        return;
      }
      const wallet = await walletService.loadWalletWithPassword(password);
      const instance = wallet.clone();
      instance.currentAccountId = currentAccount.id;
      if (exportType === 'PRIVATE_KEY') {
        const privateKey = await instance.getPrivateKeyStr();
        setExportData(privateKey);
      } else {
        const seedPhrase = instance.mnemonic;
        setExportData(seedPhrase);
      }
      setWalletExportState('RESULT');
    },
    [exportType, currentAccount, walletService],
  );

  useEffect(() => {
    _initExportType();
  }, []);

  return {
    currentAccount,
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
