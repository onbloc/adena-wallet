import { useQueryClient } from '@tanstack/react-query';
import React, { ReactElement, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, TextInputInstance } from 'react-native';

import { InjectSheetAuthView, InjectSheetPage, SheetAuthMode } from '../../components/pages';
import { toErrorMessage } from '../../core/error-message';
import { AppError, AppErrorCode, isAppError } from '../../core/errors';
import { useContainer } from '../../di/container-provider';
import { DappMethod, DappRequest } from '../../domain/dapp';
import { describeBiometricFailure } from '../../hooks/use-biometric-password';
import { useDappRequestFlow } from '../../hooks/use-dapp-request-flow';
import NativeAdenaInjectSheet from '../../native/NativeAdenaInjectSheet';
import { queryKeys } from '../../queries/query-keys';
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

const setSheetBusy = (token: string | undefined, busy: boolean): void => {
  if (NativeAdenaInjectSheet && token) {
    NativeAdenaInjectSheet.setBusy(token, busy);
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

const isBiometricFallback = (error: unknown): boolean =>
  isAppError(error, AppErrorCode.BIOMETRICS_CANCELED)
  || isAppError(error, AppErrorCode.BIOMETRICS_UNAVAILABLE)
  || isAppError(error, AppErrorCode.BIOMETRICS_INVALIDATED)
  || isAppError(error, AppErrorCode.INVALID_PASSWORD);

export const InjectSheetScreen = ({ requestUrl, callerPackage, session: providedSession }: InjectSheetScreenProps): ReactElement => {
  const { dappService, walletService } = useContainer();
  const queryClient = useQueryClient();
  const [ownSession] = useState(createSheetSession);
  const session = providedSession ?? ownSession;
  const status = useWalletStatusQuery().data ?? null;
  const biometric = useBiometricStatusQuery().data;
  const biometricLabel = biometric?.enabled ? getBiometryLabel(biometric.kind) : undefined;
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string>();
  const [focusRequest, setFocusRequest] = useState(0);
  const passwordRef = useRef<TextInputInstance>(null);
  const [done, setDone] = useState(false);
  const biometricMode = Boolean(biometricLabel) && !usePassword;

  // Focus follows the switch to the password, once the field is rendered.
  useEffect(() => {
    if (focusRequest > 0) {
      passwordRef.current?.focus();
    }
  }, [focusRequest]);

  const switchToPassword = (message?: string): void => {
    setUsePassword(true);
    setPasswordError(message);
    setFocusRequest(value => value + 1);
  };

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
        onChangePassword: (value: string): void => {
          setPassword(value);
          setPasswordError(undefined);
        },
        onUsePassword: biometricMode ? (): void => switchToPassword() : undefined,
        onUseBiometrics: biometricLabel && !biometricMode
          ? (): void => {
              setUsePassword(false);
              setPasswordError(undefined);
            }
          : undefined,
        passwordError,
        passwordRef,
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
    setSheetBusy(session.token, true);
    const callbackUrl = await flow.approve().catch((error: unknown) => {
      // Like every wallet password prompt: a cancel, lockout, changed enrollment or stale escrowed
      // password falls back to the focused password field, with biometrics still offered.
      if (biometricMode && isBiometricFallback(error)) {
        // The service turned biometric unlock off; refresh so it is not offered again.
        if (isAppError(error, AppErrorCode.BIOMETRICS_INVALIDATED)) {
          void queryClient.invalidateQueries({ queryKey: queryKeys.biometric() });
        }

        flow.resetApproval();
        switchToPassword(describeBiometricFailure(error, biometricLabel));
      }

      return null;
    });

    session.inFlight = false;

    if (callbackUrl) {
      setPassword('');
      setDone(true);
      answer(callbackUrl);
    }

    // Cleared after the answer, so a back press cannot slip in before complete.
    setSheetBusy(session.token, false);
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
