import React, { useMemo } from 'react';

import { View, WebMain } from '@components/atoms';
import useWalletExportScreen from '@hooks/web/wallet-export/use-wallet-export-screen';
import { useAccountName } from '@hooks/use-account-name';
import WalletExportCheckPassword from './check-password';
import WalletExportResult from './result';
import SensitiveInfoStep from '@components/pages/web/sensitive-info-step';
import { ADENA_DOCS_PAGE } from '@common/constants/resource.constant';
import { WebSecurityHeader } from '@components/pages/web/security-header';
import { WebMainAccountHeader } from '@components/pages/web/main-account-header';

const WalletExportScreen: React.FC = () => {
  const {
    indicatorInfo,
    currentAccount,
    exportType,
    walletExportState,
    exportData,
    backStep,
    initWalletExport,
    checkPassword,
    moveExport,
  } = useWalletExportScreen();
  const { accountNames } = useAccountName();

  const spacing = useMemo(() => {
    return null;
  }, [])

  const currentAccountDisplayName = useMemo(() => {
    if (!currentAccount) return '';
    return accountNames[currentAccount.id] || currentAccount.name;
  }, [accountNames, currentAccount]);

  const description = useMemo(() => {
    if (exportType === 'PRIVATE_KEY') {
      return 'You’re about to reveal your private key. Your private key is the only way to\nrecover your account. Be sure to store it in a safe place.';
    }
    return 'You are about to reveal your seed phrase. Your seed phrase is the only\nway to recover your wallet. Be sure to store it in a safe place.';
  }, [exportType]);

  return (
    <WebMain spacing={spacing}>
      <View style={{ width: '100%', marginBottom: 16 }}>
        {walletExportState === 'INIT' && indicatorInfo.stepLength > 1 && (
          <WebSecurityHeader
            currentStep={0}
            stepLength={indicatorInfo.stepLength}
            visibleBackButton={walletExportState !== 'INIT'}
            onClickGoBack={backStep}
          />
        )}
        {walletExportState !== 'INIT' && (
          <WebMainAccountHeader
            account={currentAccount}
            displayName={currentAccountDisplayName}
            onClickGoBack={backStep}
          />
        )}
      </View>

      {walletExportState === 'INIT' && (
        <SensitiveInfoStep
          desc={description}
          onClickNext={initWalletExport}
          link={
            exportType === 'PRIVATE_KEY'
              ? `${ADENA_DOCS_PAGE}/user-guide/sidebar-menu/settings/security-and-privacy/export-private-key`
              : `${ADENA_DOCS_PAGE}/user-guide/sidebar-menu/settings/security-and-privacy/reveal-seed-phrase`
          }
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
        <WalletExportResult exportType={exportType} exportData={exportData} />
      )}
    </WebMain>
  );
};

export default WalletExportScreen;
