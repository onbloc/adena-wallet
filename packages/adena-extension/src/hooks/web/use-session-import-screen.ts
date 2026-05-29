import { useCallback, useMemo, useState } from 'react';

import useAppNavigate from '@hooks/use-app-navigate';
import { useAdenaContext } from '@hooks/use-context';
import { useNetwork } from '@hooks/use-network';
import {
  SessionImportError,
  SessionImportErrorReason,
  SessionImportPreview,
} from '@services/wallet/wallet-session';
import { RoutePath } from '@types';

export type SessionImportStep = 'INPUT' | 'PREVIEW' | 'COMMITTING' | 'DONE';

export interface UseSessionImportReturn {
  step: SessionImportStep;
  privKey: string;
  setPrivKey: (v: string) => void;
  masterAddress: string;
  setMasterAddress: (v: string) => void;
  preview: SessionImportPreview | null;
  errorReason: SessionImportErrorReason | null;
  errorMessage: string;
  isFetchingPreview: boolean;
  isCommitting: boolean;
  canFetchPreview: boolean;
  onClickFetchPreview: () => Promise<void>;
  onClickConfirmImport: () => Promise<void>;
  onClickBack: () => void;
  onClickClose: () => void;
  // Single-shot import for session-add-screen Import tab. Skips the preview
  // UI step (session-add-screen v1 does not surface a preview screen) and
  // runs preview + commit in one call. Returns a tagged result so the
  // calling screen can render its own inline error/loading state.
  importSession: (
    privKey: string,
    masterAddress: string,
  ) => Promise<{ ok: true; sessionAddr: string } | { ok: false; error: SessionImportErrorReason }>;
  errorMessageOf: (reason: SessionImportErrorReason) => string;
}

const ERROR_MESSAGES: Record<SessionImportErrorReason, string> = {
  invalid_private_key: 'Invalid Private key format',
  invalid_master_address: 'Invalid address format',
  unsupported_network: 'Session import is only available on Gno networks.',
  no_sessions_found: 'No session found',
  session_not_found: 'Could not find this session on-chain.',
  session_expired: 'This session has expired.',
  session_already_imported: 'This session has already been imported.',
  session_pubkey_mismatch: 'This private key doesn\'t match the Session Account',
  network_changed: 'Network changed. Please fetch sessions again.',
  wallet_locked: 'Wallet is locked. Unlock it and try again.',
  network_error: 'Failed to query the chain.',
};

export const useSessionImportScreen = (): UseSessionImportReturn => {
  const { walletSessionService } = useAdenaContext();
  const { currentNetwork } = useNetwork();
  const { navigate } = useAppNavigate();

  const [step, setStep] = useState<SessionImportStep>('INPUT');
  const [privKey, setPrivKey] = useState('');
  const [masterAddress, setMasterAddress] = useState('');
  const [preview, setPreview] = useState<SessionImportPreview | null>(null);
  const [errorReason, setErrorReason] = useState<SessionImportErrorReason | null>(null);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  const errorMessage = useMemo(
    () => (errorReason ? ERROR_MESSAGES[errorReason] : ''),
    [errorReason],
  );

  const canFetchPreview = useMemo(
    () => privKey.trim().length > 0 && masterAddress.trim().length > 0 && !isFetchingPreview,
    [privKey, masterAddress, isFetchingPreview],
  );

  const handleError = useCallback((e: unknown) => {
    if (e instanceof SessionImportError) {
      setErrorReason(e.reason);
    } else {
      // Unknown errors fall back to the generic network_error bucket so the
      // user gets a graceful message instead of a raw stack trace.
      setErrorReason('network_error');
    }
  }, []);

  const onClickFetchPreview = useCallback(async (): Promise<void> => {
    if (!currentNetwork) {
      setErrorReason('unsupported_network');
      return;
    }
    setErrorReason(null);
    setIsFetchingPreview(true);
    try {
      const result = await walletSessionService.previewSessionImport(
        privKey,
        masterAddress.trim(),
        currentNetwork,
      );
      setPreview(result);
      setStep('PREVIEW');
    } catch (e) {
      handleError(e);
    } finally {
      setIsFetchingPreview(false);
    }
  }, [currentNetwork, walletSessionService, privKey, masterAddress, handleError]);

  const onClickConfirmImport = useCallback(async (): Promise<void> => {
    if (!preview || !currentNetwork) {
      return;
    }
    setErrorReason(null);
    setIsCommitting(true);
    setStep('COMMITTING');
    try {
      await walletSessionService.commitSessionImport(preview, currentNetwork, privKey);
      setStep('DONE');
      navigate(RoutePath.WebAccountAddedComplete);
    } catch (e) {
      handleError(e);
      // Roll back to PREVIEW so the user sees the banner above the existing
      // preview view. network_changed needs them to go back to INPUT to
      // re-fetch with the new network.
      if (e instanceof SessionImportError && e.reason === 'network_changed') {
        setStep('INPUT');
        setPreview(null);
      } else {
        setStep('PREVIEW');
      }
    } finally {
      setIsCommitting(false);
    }
  }, [preview, currentNetwork, walletSessionService, privKey, navigate, handleError]);

  const onClickBack = useCallback((): void => {
    if (step === 'PREVIEW') {
      setStep('INPUT');
      setErrorReason(null);
      return;
    }
    navigate(RoutePath.WebAccountAdd);
  }, [step, navigate]);

  const onClickClose = useCallback((): void => {
    navigate(RoutePath.WebAccountAdd);
  }, [navigate]);

  const importSession = useCallback(
    async (
      privKeyInput: string,
      masterInput: string,
    ): Promise<
      { ok: true; sessionAddr: string } | { ok: false; error: SessionImportErrorReason }
    > => {
      if (!currentNetwork) {
        return { ok: false, error: 'unsupported_network' };
      }
      try {
        const preview = await walletSessionService.previewSessionImport(
          privKeyInput,
          masterInput.trim(),
          currentNetwork,
        );
        await walletSessionService.commitSessionImport(preview, currentNetwork, privKeyInput);
        return { ok: true, sessionAddr: preview.sessionAddr };
      } catch (e) {
        if (e instanceof SessionImportError) {
          return { ok: false, error: e.reason };
        }
        return { ok: false, error: 'network_error' };
      }
    },
    [currentNetwork, walletSessionService],
  );

  const errorMessageOf = useCallback(
    (reason: SessionImportErrorReason): string => ERROR_MESSAGES[reason],
    [],
  );

  return {
    step,
    privKey,
    setPrivKey,
    masterAddress,
    setMasterAddress,
    preview,
    errorReason,
    errorMessage,
    isFetchingPreview,
    isCommitting,
    canFetchPreview,
    onClickFetchPreview,
    onClickConfirmImport,
    onClickBack,
    onClickClose,
    importSession,
    errorMessageOf,
  };
};
