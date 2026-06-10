import React, { ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Account, Document, isLedgerAccount, isSessionAccount } from 'adena-module';

import useAppNavigate from '@hooks/use-app-navigate';
import useLink from '@hooks/use-link';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useNetwork } from '@hooks/use-network';
import { useMasterSessions } from '@hooks/wallet/use-master-sessions';
import { useNetworkFee } from '@hooks/wallet/use-network-fee';
import { useRevokeSession } from '@hooks/wallet/use-revoke-session';
import { WarningBox } from '@components/atoms/warning-box';
import { BottomFixedButtonGroup } from '@components/molecules/bottom-fixed-button-group';
import { ApproveLedgerLoading } from '@components/molecules/approve-ledger-loading';
import NetworkFee from '@components/molecules/network-fee/network-fee';
import TransactionResult from '@components/molecules/transaction-result';
import { SessionDetailCard } from '@components/molecules/session-detail-card';
import NetworkFeeSetting from '@components/pages/network-fee-setting/network-fee-setting/network-fee-setting';
import BroadcastTransactionLoading from '@pages/popup/wallet/broadcast-transaction-screen/loading';
import { createMessageOfRevokeSession } from '@services/transaction/message/auth/auth';
import { RoutePath } from '@types';
import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';

const GNO_PREFIX = 'g';

const Container = styled.div`
  ${mixins.flex({ direction: 'column', align: 'stretch', justify: 'flex-start' })};
  width: 100%;
  padding: 16px 20px 120px;
  gap: 20px;
`;

const Card = styled.div`
  background-color: ${getTheme('neutral', '_9')};
  border-radius: 12px;
  overflow: hidden;
`;

const Status = styled.div`
  ${fonts.body3Reg};
  padding: 32px 12px;
  text-align: center;
  color: ${getTheme('neutral', 'a')};
`;

const ErrorText = styled.div`
  ${fonts.body3Reg};
  color: ${getTheme('red', 'a')};
  padding: 0 4px;
`;

const NetworkFeeSettingWrapper = styled.div`
  padding: 24px 20px;
`;

type ScreenState = 'SUMMARY' | 'LOADING' | 'LEDGER_APPROVAL' | 'RESULT';
type RevokeResult = {
  status: 'SUCCESS' | 'FAILED';
  hash?: string | null;
  errorMessage?: string | null;
};

const RevokeSessionPage = (): ReactElement => {
  const { params, navigate, goBack } = useAppNavigate<RoutePath.RevokeSession>();
  const { openScannerLink } = useLink();
  const { wallet } = useWalletContext();
  const { transactionService } = useAdenaContext();
  const { currentNetwork } = useNetwork();
  const { revokeOne, isPending, errorMessage } = useRevokeSession();

  const sessionAddr = params?.sessionAddr;
  const masterAddress = params?.masterAddress;

  const { entries, isLoading, error } = useMasterSessions(masterAddress);
  const entry = useMemo(
    () => (sessionAddr ? entries.find((e) => e.sessionAddr === sessionAddr) : undefined),
    [entries, sessionAddr],
  );

  const [document, setDocument] = useState<Document | null>(null);
  const [masterAccount, setMasterAccount] = useState<Account | null>(null);
  const [openedFeeSetting, setOpenedFeeSetting] = useState(false);
  const [screenState, setScreenState] = useState<ScreenState>('SUMMARY');
  const [revokeResult, setRevokeResult] = useState<RevokeResult | null>(null);

  const useNetworkFeeReturn = useNetworkFee(document);
  const networkFee = useNetworkFeeReturn.networkFee;

  useEffect(() => {
    let cancelled = false;
    (async (): Promise<void> => {
      if (!entry || !entry.publicKey || !wallet) {
        setDocument(null);
        setMasterAccount(null);
        return;
      }
      // Find the master account in this wallet by derived address. The first
      // non-session account is NOT trustworthy because wallets can hold many
      // masters; iterate and match the master that owns this session.
      let signer = null;
      for (const account of wallet.accounts) {
        if (isSessionAccount(account)) continue;
        const addr = await account.getAddress(GNO_PREFIX);
        if (addr === entry.masterAddress) {
          signer = account;
          break;
        }
      }
      if (!signer || cancelled) {
        setDocument(null);
        setMasterAccount(null);
        return;
      }
      setMasterAccount(signer);
      const message = createMessageOfRevokeSession({
        creator: entry.masterAddress,
        sessionPublicKey: entry.publicKey,
      });
      const gasWanted = useNetworkFeeReturn.currentGasInfo?.gasWanted || 0;
      const gasFee = useNetworkFeeReturn.currentGasFeeRawAmount;
      try {
        const doc = await transactionService.createDocument(
          signer,
          currentNetwork.chainId,
          [message],
          GNO_PREFIX,
          gasWanted,
          gasFee,
          '',
        );
        if (!cancelled) setDocument(doc);
      } catch {
        if (!cancelled) setDocument(null);
      }
    })();
    return (): void => {
      cancelled = true;
    };
  }, [
    entry,
    wallet,
    transactionService,
    currentNetwork.chainId,
    useNetworkFeeReturn.currentGasInfo?.gasWanted,
    useNetworkFeeReturn.currentGasFeeRawAmount,
  ]);

  const handleOpenAccount = useCallback(
    (address: string) => openScannerLink(`/account/${address}`),
    [openScannerLink],
  );
  const handleOpenRealm = useCallback(
    (path: string) => openScannerLink('/realms/details', { path }),
    [openScannerLink],
  );

  const handleRevoke = useCallback(async () => {
    if (!entry || !entry.publicKey) return;
    setScreenState(masterAccount && isLedgerAccount(masterAccount) ? 'LEDGER_APPROVAL' : 'LOADING');
    const result = await revokeOne({
      masterAddress: entry.masterAddress,
      sessionAddr: entry.sessionAddr,
      sessionPublicKey: entry.publicKey,
      opts: {
        gasWanted: useNetworkFeeReturn.currentGasInfo?.gasWanted,
        gasFeeUgnot: useNetworkFeeReturn.currentGasFeeRawAmount,
        document: document ?? undefined,
      },
    });
    if (result.ok) {
      setRevokeResult({ status: 'SUCCESS', hash: result.hash });
    } else {
      setRevokeResult({ status: 'FAILED', errorMessage: result.error });
    }
    setScreenState('RESULT');
  }, [document, entry, masterAccount, revokeOne, useNetworkFeeReturn]);

  const onClickResultClose = useCallback(() => {
    if (entry) {
      navigate(RoutePath.ManageSessions, {
        state: { masterAddress: entry.masterAddress },
        replace: true,
      });
    } else {
      goBack();
    }
  }, [entry, navigate, goBack]);

  const onClickViewHistory = useCallback(() => {
    navigate(RoutePath.History);
  }, [navigate]);

  const onClickViewGnoscan = useCallback(() => {
    if (revokeResult?.hash) {
      openScannerLink('/transactions/details', { txhash: revokeResult.hash });
    }
  }, [revokeResult, openScannerLink]);

  if (screenState === 'LOADING') {
    return <BroadcastTransactionLoading />;
  }

  if (screenState === 'LEDGER_APPROVAL') {
    return <ApproveLedgerLoading document={document} onClickCancel={goBack} />;
  }

  if (screenState === 'RESULT' && revokeResult) {
    return (
      <TransactionResult
        status={revokeResult.status}
        errorMessage={revokeResult.errorMessage}
        onClickViewHistory={onClickViewHistory}
        onClickViewGnoscan={onClickViewGnoscan}
        onClickClose={onClickResultClose}
      />
    );
  }

  if (!sessionAddr || !masterAddress) {
    return (
      <Container>
        <Status>Missing navigation context.</Status>
        <BottomFixedButtonGroup
          filled
          leftButton={{ text: 'Cancel', onClick: goBack }}
          rightButton={{ text: 'Revoke', danger: true, disabled: true, onClick: (): void => undefined }}
        />
      </Container>
    );
  }

  if (isLoading && !entry) {
    return (
      <Container>
        <Status>Loading session…</Status>
        <BottomFixedButtonGroup
          filled
          leftButton={{ text: 'Cancel', onClick: goBack }}
          rightButton={{ text: 'Revoke', danger: true, disabled: true, onClick: (): void => undefined }}
        />
      </Container>
    );
  }

  if (error || !entry) {
    return (
      <Container>
        <Status>{error ? `Failed to load session: ${error}` : 'Session not found on chain.'}</Status>
        <BottomFixedButtonGroup
          filled
          leftButton={{ text: 'Cancel', onClick: goBack }}
          rightButton={{ text: 'Revoke', danger: true, disabled: true, onClick: (): void => undefined }}
        />
      </Container>
    );
  }

  if (openedFeeSetting) {
    return (
      <NetworkFeeSettingWrapper>
        <NetworkFeeSetting
          {...useNetworkFeeReturn}
          onClickBack={(): void => setOpenedFeeSetting(false)}
          onClickSave={(): void => {
            useNetworkFeeReturn.save();
            setOpenedFeeSetting(false);
          }}
        />
      </NetworkFeeSettingWrapper>
    );
  }

  const canRevoke =
    !!entry.publicKey && !!document && !isPending && !!networkFee && !useNetworkFeeReturn.isLoading;

  return (
    <Container>
      <Card>
        <SessionDetailCard
          showMasterRow
          masterAddress={entry.masterAddress}
          expiresAt={entry.expiresAt}
          allowPaths={entry.allowPaths}
          spendLimitUgnot={entry.spendLimit || undefined}
          spendPeriod={entry.spendPeriod || undefined}
          spendUsedUgnot={entry.spendUsed || undefined}
          spendReset={entry.spendReset || undefined}
          onOpenAccount={handleOpenAccount}
          onOpenRealm={handleOpenRealm}
        />
      </Card>

      <WarningBox type='sessionRevoke' />

      <NetworkFee
        value={networkFee?.amount ?? ''}
        denom={networkFee?.denom ?? ''}
        isLoading={useNetworkFeeReturn.isLoading}
        isError={useNetworkFeeReturn.isSimulateError}
        onClickSetting={(): void => setOpenedFeeSetting(true)}
      />

      {errorMessage && <ErrorText>{errorMessage}</ErrorText>}

      <BottomFixedButtonGroup
        filled
        leftButton={{ text: 'Cancel', disabled: isPending, onClick: goBack }}
        rightButton={{
          text: isPending ? 'Revoking…' : 'Revoke',
          danger: true,
          disabled: !canRevoke,
          onClick: handleRevoke,
        }}
      />
    </Container>
  );
};

export default RevokeSessionPage;
