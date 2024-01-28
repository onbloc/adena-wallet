import React, { useCallback, useMemo } from 'react';

import { WebMain } from '@components/atoms';
import useWalletExportScreen from '@hooks/web/wallet-export/use-wallet-export-screen';
import { WebMainAccountHeader } from '@components/pages/web/main-account-header';
import WalletExportCheckPassword from './check-password';
import WalletExportResult from './result';
import SensitiveInfoStep from '@components/pages/web/sensitive-info-step';

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

  const description = useMemo(() => {
    if (exportType === 'PRIVATE_KEY') {
      return 'You’re about to reveal your private key. Your private key is the only way to\nrecover your account. Be sure to store it in a safe place.';
    }
    return 'You are about to reveal your seed phrase. Your seed phrase is the only\nway to recover your wallet. Be sure to store it in a safe place.';
  }, [exportType]);

  return (
    <WebMain>
      <WebMainAccountHeader account={currentAccount} onClickGoBack={onClickGoBack} />
      {walletExportState === 'INIT' && (
        <SensitiveInfoStep desc={description} onClickNext={initWalletExport} />
      )}
      {walletExportState === 'CHECK_PASSWORD' && (
        <WalletExportCheckPassword
          exportType={exportType}
          checkPassword={checkPassword}
          moveExport={moveExport}
        />
      )}
      {walletExportState === 'RESULT' && (
        <WalletExportResult exportType={exportType} exportData={exportData} />
      )}
    </WebMain>
  );
};

export default WalletExportScreen;
