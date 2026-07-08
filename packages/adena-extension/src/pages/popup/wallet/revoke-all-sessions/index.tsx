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
import { resolveSessionAdminGasInfo } from '@common/utils/session-admin-gas';
import { WarningBox } from '@components/atoms/warning-box';
import { BottomFixedButtonGroup } from '@components/molecules/bottom-fixed-button-group';
import { ApproveLedgerLoading } from '@components/molecules/approve-ledger-loading';
import NetworkFee from '@components/molecules/network-fee/network-fee';
import TransactionResult from '@components/molecules/transaction-result';
import NetworkFeeSetting from '@components/pages/network-fee-setting/network-fee-setting/network-fee-setting';
import BroadcastTransactionLoading from '@pages/popup/wallet/broadcast-transaction-screen/loading';
import { createMessageOfRevokeAllSessions } from '@services/transaction/message/auth/auth';
import { formatAddress } from '@common/utils/client-utils';
import { GNO_ADDRESS_PREFIX as GNO_PREFIX } from '@common/constants/chain.constant';
import { RoutePath } from '@types';
import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';

const Container = styled.div`
  ${mixins.flex({ direction: 'column', align: 'stretch', justify: 'flex-start' })};
  width: 100%;
  padding: 16px 20px 120px;
  gap: 12px;
`;

const SessionRow = styled.div`
  ${mixins.flex({ direction: 'column', align: 'flex-start', justify: 'flex-start' })};
  width: 100%;
  padding: 14px 18px;
  background-color: ${getTheme('neutral', '_9')};
  border-radius: 12px;
  gap: 4px;

  .name {
    ${fonts.body2Bold};
    color: #777777;
  }

  .address {
    ${fonts.body2Reg};
    color: #ffffff;
  }
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

const RevokeAllSessionsPage = (): ReactElement => {
  const { params, navigate, goBack } = useAppNavigate<RoutePath.RevokeAllSessions>();
  const { wallet, gnoProvider } = useWalletContext();
  const { transactionService, transactionGasService } = useAdenaContext();
  const { currentNetwork } = useNetwork();
  const { openScannerLink } = useLink();
  const { revokeAll, isPending, errorMessage } = useRevokeSession();
  const masterAddress = params?.masterAddress;

  const { entries, isLoading, error } = useMasterSessions(masterAddress);
  const activeEntries = useMemo(
    () => entries.filter((e) => e.status === 'ACTIVE'),
    [entries],
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
      if (!masterAddress || !wallet) {
        setDocument(null);
        setMasterAccount(null);
        return;
      }
      let signer = null;
      for (const account of wallet.accounts) {
        if (isSessionAccount(account)) continue;
        const addr = await account.getAddress(GNO_PREFIX);
        if (addr === masterAddress) {
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
      const message = createMessageOfRevokeAllSessions({ creator: masterAddress });
      try {
        const gasInfo = await resolveSessionAdminGasInfo({
          gnoProvider,
          transactionService,
          transactionGasService,
          masterAccount: signer,
          chainId: currentNetwork.chainId,
          message,
        });
        const doc = await transactionService.createDocument(
          signer,
          currentNetwork.chainId,
          [message],
          GNO_PREFIX,
          gasInfo.gasWanted,
          gasInfo.gasFeeUgnot,
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
    masterAddress,
    wallet,
    gnoProvider,
    transactionService,
    transactionGasService,
    currentNetwork.chainId,
  ]);

  const handleRevoke = useCallback(async () => {
    if (!masterAddress) return;
    setScreenState(masterAccount && isLedgerAccount(masterAccount) ? 'LEDGER_APPROVAL' : 'LOADING');
    const result = await revokeAll(masterAddress, {
      gasWanted: useNetworkFeeReturn.currentGasInfo?.gasWanted,
      gasFeeUgnot: useNetworkFeeReturn.currentGasFeeRawAmount,
      document: document ?? undefined,
    });
    if (result.ok) {
      setRevokeResult({ status: 'SUCCESS', hash: result.hash });
    } else {
      setRevokeResult({ status: 'FAILED', errorMessage: result.error });
    }
    setScreenState('RESULT');
  }, [document, masterAccount, masterAddress, revokeAll, useNetworkFeeReturn]);

  const onClickResultClose = useCallback(() => {
    if (masterAddress) {
      navigate(RoutePath.ManageSessions, { state: { masterAddress }, replace: true });
    } else {
      goBack();
    }
  }, [masterAddress, navigate, goBack]);

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

  if (!masterAddress) {
    return (
      <Container>
        <Status>Master address missing.</Status>
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
    activeEntries.length > 0 &&
    !!document &&
    !isPending &&
    !!networkFee &&
    !useNetworkFeeReturn.isLoading;

  return (
    <Container>
      {isLoading && activeEntries.length === 0 && <Status>Loading sessions…</Status>}
      {!isLoading && error && <Status>Failed to load sessions: {error}</Status>}

      {activeEntries.map((entry) => (
        <SessionRow key={entry.sessionAddr}>
          <span className='name'>{entry.name}</span>
          <span className='address'>{formatAddress(entry.sessionAddr, 6)}</span>
        </SessionRow>
      ))}

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

export default RevokeAllSessionsPage;
