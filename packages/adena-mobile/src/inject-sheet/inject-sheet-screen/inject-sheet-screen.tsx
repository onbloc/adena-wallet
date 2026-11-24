import React, { ReactElement, useEffect, useMemo, useState } from 'react';
import { Linking } from 'react-native';

import { InjectSheetAuthView, InjectSheetPage, SheetAuthMode } from '../../components/pages';
import { toErrorMessage } from '../../core/error-message';
import { AppError, AppErrorCode, isAppError } from '../../core/errors';
import { useContainer } from '../../di/container-provider';
import { DappMethod, DappRequest } from '../../domain/dapp';
import { useDappRequestFlow } from '../../hooks/use-dapp-request-flow';
import NativeAdenaInjectSheet from '../../native/NativeAdenaInjectSheet';
import { useBiometricStatusQuery, useWalletStatusQuery } from '../../queries/wallet.queries';
import { WalletStatus } from '../../services/wallet.service';
import { getBiometryLabel } from '../../utils/biometry';

// Per-sheet state: several sheets can be mounted at once and share the JS runtime.
export interface SheetSession {
  // Token from InjectSheetActivity's launch options; native calls only reach that activity.
  token?: string;
  // True while signing/broadcasting; a crash then must not answer the dApp a second time.
  inFlight: boolean;
  // True once the dApp was answered; no second approval or response.
  done: boolean;
  // Answers the dApp on back press; set by the mounted screen.
  onDismissRequest?: () => void;
}

export const createSheetSession = (token?: string): SheetSession => ({ token, inFlight: false, done: false });

// Hands the response back natively (Android) and closes the sheet with this token.
export const finishSheet = (token: string | undefined, callbackUrl: string | null): void => {
  if (NativeAdenaInjectSheet && token) {
    if (callbackUrl) {
      NativeAdenaInjectSheet.complete(token, callbackUrl);
    }
    else {
      NativeAdenaInjectSheet.dismiss(token);
    }

    return;
  }

  if (callbackUrl) {
    Linking.openURL(callbackUrl).catch(() => undefined);
  }
};

interface ParsedRequest {
  request: DappRequest | null;
  error?: string;
  duplicate?: boolean;
}

export interface InjectSheetScreenProps {
  requestUrl?: string;
  // Launching package reported by Android (not by the payload).
  callerPackage?: string;
  session?: SheetSession;
}

export const InjectSheetScreen = ({ requestUrl, callerPackage, session: providedSession }: InjectSheetScreenProps): ReactElement => {
  const { dappService, walletService } = useContainer();
  const [ownSession] = useState(createSheetSession);
  const session = providedSession ?? ownSession;
  const status = useWalletStatusQuery().data ?? null;
  const biometric = useBiometricStatusQuery().data;
  const biometricLabel = biometric?.enabled ? getBiometryLabel(biometric.kind) : undefined;
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [done, setDone] = useState(false);
  const biometricMode = Boolean(biometricLabel) && !usePassword;

  const parsed = useMemo((): ParsedRequest => {
    if (!requestUrl) {
      return { request: null, error: 'No request was received.' };
    }

    try {
      const request = dappService.parseRequestUrl(requestUrl, callerPackage);

      return { request, duplicate: dappService.isProcessed(request) };
    }
    catch (error) {
      return { request: null, error: toErrorMessage(error) };
    }
  }, [callerPackage, dappService, requestUrl]);

  // The overlay session is always locked, so connecting and signing both need fresh authentication.
  const flow = useDappRequestFlow(status === WalletStatus.EMPTY || parsed.duplicate || done ? null : parsed.request, {
    allowCrossNetwork: true,
    authorize: async () => {
      if (biometricMode) {
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
      : parsed.duplicate
        ? { title: 'Request already handled', description: 'This request was answered before. Start a new request from the app.' }
        : done
          ? { title: 'Response sent', description: 'You can return to the app.' }
          : undefined;

  const { request, context } = flow;

  const auth: InjectSheetAuthView | undefined = request
    ? {
        mode: biometricMode ? SheetAuthMode.BIOMETRIC : SheetAuthMode.PASSWORD,
        biometricLabel,
        password,
        onChangePassword: setPassword,
        onUsePassword: biometricMode ? (): void => setUsePassword(true) : undefined,
        onUseBiometrics: biometricLabel && !biometricMode ? (): void => setUsePassword(false) : undefined,
      }
    : undefined;

  const answer = (callbackUrl: string | null): void => {
    session.done = true;
    finishSheet(session.token, callbackUrl);
  };

  // A second tap before the re-render must not authorize, sign or answer twice.
  const handleApprove = async (): Promise<void> => {
    if (session.inFlight || session.done) {
      return;
    }

    flow.resetApproval();
    session.inFlight = true;
    const callbackUrl = await flow.approve().catch((error: unknown) => {
      // Lockout or a changed enrollment: biometrics cannot succeed, so offer the password.
      if (biometricMode && isAppError(error, AppErrorCode.BIOMETRICS_UNAVAILABLE)) {
        setUsePassword(true);
      }

      return null;
    });

    session.inFlight = false;

    if (callbackUrl) {
      setPassword('');
      setDone(true);
      answer(callbackUrl);
    }
  };

  const handleReject = (): void => {
    if (session.inFlight) {
      return;
    }

    if (session.done) {
      finishSheet(session.token, null);
      return;
    }

    if (parsed.duplicate && parsed.request) {
      answer(dappService.rejectDuplicate(parsed.request));
      return;
    }

    answer(unavailable ? null : flow.rejectionUrl());
  };

  useEffect(() => {
    session.onDismissRequest = handleReject;

    return (): void => {
      session.onDismissRequest = undefined;
    };
  });

  return (
    <InjectSheetPage
      title={flow.title}
      dappName={request?.dapp.name}
      origin={request?.callbackOrigin}
      callerPackage={request?.callerPackage}
      rows={context
        ? [
            { label: 'Account', value: context.account.name },
            { label: 'Address', value: context.address, multiline: true },
            { label: 'Network', value: `${context.network.chainName} ${context.network.networkName}` },
          ]
        : []}
      messages={flow.messages}
      memo={request && request.method !== DappMethod.CONNECT ? request.memo : undefined}
      fee={flow.feeLabel}
      feeWarning={flow.feeWarning}
      expandedCode={flow.expandedCode}
      onToggleCode={flow.toggleCode}
      codeReviewPending={flow.codeReviewPending}
      loading={flow.loading || status === null}
      error={flow.error}
      unavailable={unavailable}
      auth={auth}
      approveLabel={flow.approveLabel}
      approving={flow.approving}
      canApprove={!done && flow.canApprove && (auth?.mode !== SheetAuthMode.PASSWORD || password.length > 0)}
      onApprove={handleApprove}
      onReject={handleReject}
    />
  );
};
