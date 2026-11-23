import React, { ReactElement, useMemo, useState } from 'react';
import { Linking } from 'react-native';

import { InjectSheetAuthView, InjectSheetPage, SheetAuthMode } from '../../components/pages';
import { toErrorMessage } from '../../core/error-message';
import { AppError, AppErrorCode } from '../../core/errors';
import { useContainer } from '../../di/container-provider';
import { DappRequest } from '../../domain/dapp';
import { useDappRequestFlow } from '../../hooks/use-dapp-request-flow';
import NativeAdenaInjectSheet from '../../native/NativeAdenaInjectSheet';
import { useBiometricStatusQuery, useWalletStatusQuery } from '../../queries/wallet.queries';
import { WalletStatus } from '../../services/wallet.service';
import { getBiometryLabel } from '../../utils/biometry';

// True while signing/broadcasting; a crash then must not answer the dApp a second time.
export const sheetApproval = { inFlight: false };

// Hands the response back natively (Android) and closes the sheet.
export const finishSheet = (callbackUrl: string | null): void => {
  if (NativeAdenaInjectSheet) {
    if (callbackUrl) {
      NativeAdenaInjectSheet.complete(callbackUrl);
    }
    else {
      NativeAdenaInjectSheet.dismiss();
    }

    return;
  }

  if (callbackUrl) {
    Linking.openURL(callbackUrl).catch(() => undefined);
  }
};

export const InjectSheetScreen = ({ requestUrl }: { requestUrl?: string }): ReactElement => {
  const { dappService, walletService } = useContainer();
  const status = useWalletStatusQuery().data ?? null;
  const biometric = useBiometricStatusQuery().data;
  const biometricLabel = biometric?.enabled ? getBiometryLabel(biometric.kind) : undefined;
  const [password, setPassword] = useState('');

  const parsed = useMemo((): { request: DappRequest | null; error?: string } => {
    try {
      return { request: requestUrl ? dappService.parseRequestUrl(requestUrl) : null, error: requestUrl ? undefined : 'No request was received.' };
    }
    catch (error) {
      return { request: null, error: toErrorMessage(error) };
    }
  }, [dappService, requestUrl]);

  // Every signature needs fresh authentication; the overlay session is locked again right after.
  const flow = useDappRequestFlow(status === WalletStatus.EMPTY ? null : parsed.request, {
    allowCrossNetwork: true,
    authorize: async () => {
      if (biometricLabel) {
        await walletService.unlockWithBiometrics({ title: 'Confirm with biometrics', cancel: 'Cancel' });
        return;
      }

      if (!password) {
        throw new AppError(AppErrorCode.INVALID_PASSWORD, 'Enter your wallet password');
      }

      await walletService.unlock(password);
    },
    release: () => walletService.lock(),
  });

  const unavailable = parsed.error
    ? { title: 'Invalid request', description: parsed.error }
    : status === WalletStatus.EMPTY
      ? { title: 'Set up Adena first', description: 'Create or import a wallet in Adena, then try again from the app.' }
      : undefined;

  const auth: InjectSheetAuthView | undefined = flow.isTransaction
    ? { mode: biometricLabel ? SheetAuthMode.BIOMETRIC : SheetAuthMode.PASSWORD, biometricLabel, password, onChangePassword: setPassword }
    : undefined;

  const { request, context } = flow;

  const handleApprove = async (): Promise<void> => {
    flow.resetApproval();
    sheetApproval.inFlight = true;
    const callbackUrl = await flow.approve().catch(() => null);

    sheetApproval.inFlight = false;

    if (callbackUrl) {
      setPassword('');
      finishSheet(callbackUrl);
    }
  };

  const handleReject = (): void => finishSheet(unavailable ? null : flow.rejectionUrl());

  return (
    <InjectSheetPage
      title={flow.title}
      dappName={request?.dapp.name}
      origin={request?.callbackOrigin}
      rows={context
        ? [
            { label: 'Account', value: context.account.name },
            { label: 'Address', value: context.address, multiline: true },
            { label: 'Network', value: `${context.network.chainName} ${context.network.networkName}` },
          ]
        : []}
      messages={flow.messages}
      fee={flow.feeLabel}
      loading={flow.loading || status === null}
      error={flow.error}
      unavailable={unavailable}
      auth={auth}
      approveLabel={flow.approveLabel}
      approving={flow.approving}
      canApprove={flow.canApprove && (auth?.mode !== SheetAuthMode.PASSWORD || password.length > 0)}
      onApprove={handleApprove}
      onReject={handleReject}
    />
  );
};
