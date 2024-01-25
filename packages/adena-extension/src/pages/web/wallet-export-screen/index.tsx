import React, { useCallback } from 'react';

import { WebMain } from '@components/atoms';
import useWalletExportScreen from '@hooks/web/wallet-export/use-wallet-export-screen';
import { WebMainAccountHeader } from '@components/pages/web/main-account-header';
import WalletExportInitStep from './init-step';
import WalletExportCheckPassword from './check-password';
import WalletExportResult from './result';

const WalletExportScreen: React.FC = () => {
  const {
    currentAccount,
    exportType,
    walletExportState,
    exportData,
    backStep,
    initWalletExport,
    checkPassword,
    moveExport,
  } = useWalletExportScreen();

  const onClickGoBack = useCallback(() => {
    backStep();
  }, [backStep]);

  return (
    <WebMain>
      <WebMainAccountHeader
        account={currentAccount}
        onClickGoBack={onClickGoBack}
      />
      {walletExportState === 'INIT' && (
        <WalletExportInitStep
          exportType={exportType}
          initWalletExport={initWalletExport}
        />
      )}
      {walletExportState === 'CHECK_PASSWORD' && (
        <WalletExportCheckPassword
          exportType={exportType}
          checkPassword={checkPassword}
          moveExport={moveExport}
        />
      )}
      {walletExportState === 'RESULT' && (
        <WalletExportResult
          exportType={exportType}
          exportData={exportData}
        />
      )}
    </WebMain>
  );
};

export default WalletExportScreen;
