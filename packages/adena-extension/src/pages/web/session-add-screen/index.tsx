import BigNumber from 'bignumber.js';
import { ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import IconError from '@assets/web/error.svg';
import {
  GNO_ADDRESS_PREFIX as GNO_PREFIX, SESSION_UNSUPPORTED_CHAIN_IDS
} from '@common/constants/chain.constant';
import { ADENA_DOCS_PAGE } from '@common/constants/resource.constant';
import { GNOT_TOKEN } from '@common/constants/token.constant';
import { isSessionMasterAccount } from '@common/utils/account-session';
import { encodeParameter } from '@common/utils/client-utils';
import { stringToBase64 } from '@common/utils/encoding-util';
import { resolveSessionAdminGasInfo } from '@common/utils/session-admin-gas';
import {
  Row,
  View,
  WebButton,
  WebCheckBox,
  WebImg,
  WebMain,
  WebText
} from '@components/atoms';
import Toggle from '@components/atoms/toggle';
import { WebCopyButton } from '@components/atoms/web-copy-button';
import { WebHoldButton } from '@components/atoms/web-hold-button';
import { WebTextarea } from '@components/atoms/web-textarea';
import { WebTitleWithDescription } from '@components/molecules';
import { WebPrivateKeyBox } from '@components/molecules/web-private-key-box';
import WebWarningDescriptionBox from '@components/molecules/web-warning-description-box/web-warning-description-box';
import { WebMainHeader } from '@components/pages/web/main-header';
import SensitiveInfoStep from '@components/pages/web/sensitive-info-step';
import { Wallet as Tm2Wallet } from '@gnolang/tm2-js-client';
import useAppNavigate from '@hooks/use-app-navigate';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useNetwork } from '@hooks/use-network';
import useQuestionnaire from '@hooks/web/use-questionnaire';
import { useSessionImportScreen } from '@hooks/web/use-session-import-screen';
import { createMessageOfCreateSession } from '@services/transaction/message/auth/auth';
import { pendingWalletStore } from '@services/wallet/pending-wallet-store';
import type {
  SessionImportCandidate,
  SessionImportErrorReason,
  SessionImportPreview,
  SessionImportRequest
} from '@services/wallet/wallet-session';
import { RoutePath } from '@types';
import {
  Account,
  fromHex,
  publicKeyToAddress,
  SessionAccount,
  SessionKeyring,
  validateAddress,
  type SessionConfig
} from 'adena-module';
import {
  MASTER_ADDRESS_FORMAT_ERROR,
  MASTER_ADDRESS_LENGTH,
  NO_SESSION_FOUND_ERROR,
  sanitizeMasterAddressInput,
  sanitizeSessionPrivateKeyInput
} from './session-import-utils';

import {
  AmountInput, AmountInputWrapper, Card, ChangeUnitIcon, ConfigureCard, DisableTransferToggleWrapper, DropdownChevronIcon, ErrorBanner, Field, IconButton, ImportErrorList,
  ImportErrorRow, ImportSessionAddress, InlineErrorRow, KeyActionRow, MasterAddressWrapper, MasterInfoIcon,
  MasterInputField, MasterInputRow,
  MasterLabelArea, MasterLabelCell,
  MasterLabelInfoIcon, MasterTooltipBox, MinusIcon, PlusIcon, RealmInputBox,
  RealmInputInner, SelectField, SelectMenu,
  SelectOption, SelectTrigger, SessionCard, SessionCardBody, SessionCardHeader, SessionRows, SpendPeriodInput, SpendPeriodInputWrapper, Spinner, TabButton, TabRow, TooltipBox,
  TooltipBoxAbove, TooltipWrapper, UnitToggle
} from './session-add-screen.styles';

const MAX_REALM_PATHS_GAS_ONLY = 8;
const MAX_REALM_PATHS_TRANSFER_ENABLED = 6;
const MAX_EXPIRES_DAYS = 30;
const EXPIRES_DAY_OPTIONS: number[] = Array.from({ length: MAX_EXPIRES_DAYS }, (_, i) => i + 1);
const DEFAULT_EXPIRES_DAYS = 30;
const DEFAULT_SPEND_LIMIT_GNOT = '100';
const MAX_SPEND_PERIOD_SECONDS = MAX_EXPIRES_DAYS * 24 * 60 * 60;
const SECONDS_PER_DAY = 24 * 60 * 60;
const SECONDS_PER_HOUR = 60 * 60;
const ALLOW_PATHS_WILDCARD = '*';
const VM_EXEC_ALLOW_PATH_PREFIX = 'vm/exec:';
const REALM_PATH_PREFIX = 'gno.land/r/';
const SESSION_ALLOW_PATH_ROUTE_TYPES = new Set([
  'vm/exec',
  'vm/run',
  'bank/send',
  'bank/multisend',
]);
const REALM_PATH_FORMAT_ERROR = 'Invalid path';
const REALM_NOT_FOUND_ERROR = 'Realm not found';
const REALM_VALIDATION_ERROR = 'Unable to validate realm. Try again.';

type SpendPeriodUnit = 'days' | 'hours';
type RealmValidationResult = { ok: true } | { ok: false; error: string };

const isSessionSupportedChainId = (chainId: string): boolean => {
  return !SESSION_UNSUPPORTED_CHAIN_IDS.includes(chainId);
};

const isRealmPathFormatValid = (path: string): boolean => {
  return (
    path.startsWith(REALM_PATH_PREFIX) &&
    !path.endsWith('/') &&
    !path.includes(':') &&
    !/\s/.test(path)
  );
};

const isSessionAllowPathRouteType = (path: string): boolean => {
  return SESSION_ALLOW_PATH_ROUTE_TYPES.has(path);
};

const isSessionPathInputValid = (path: string): boolean => {
  return isRealmPathFormatValid(path) || isSessionAllowPathRouteType(path);
};

const toSessionAllowPath = (path: string): string => {
  return isSessionAllowPathRouteType(path) ? path : `${VM_EXEC_ALLOW_PATH_PREFIX}${path}`;
};

const sanitizeRealmPathInput = (value: string): string => {
  return value.replace(/[^\x21-\x7E]/g, '');
};

const formatExpiryLabel = (days: number): string => {
  const target = new Date(Date.now() + days * SECONDS_PER_DAY * 1000);
  return target.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

type Tab = 'create' | 'import';

const generateSessionPrivateKeyHex = (): string => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

const SessionAddScreen = (): ReactElement => {
  const { navigate, params } = useAppNavigate<RoutePath.WebSessionAdd>();
  const { wallet } = useWalletContext();
  const { walletSessionService } = useAdenaContext();
  const { currentNetwork } = useNetwork();
  const sessionImport = useSessionImportScreen();
  const { errorMessageOf } = sessionImport;

  const { ableToSkipQuestionnaire, isQuestionnaireLoading } = useQuestionnaire();
  const doneQuestionnaire = params?.doneQuestionnaire === true;

  // Start at FORM directly when returning from questionnaire.
  const [step, setStep] = useState<'INIT' | 'FORM'>(doneQuestionnaire ? 'FORM' : 'INIT');

  // Redirect to Questionnaire only when the user has passed SensitiveInfoStep (step === 'FORM').
  useEffect(() => {
    if (step !== 'FORM') return;
    if (isQuestionnaireLoading) return;
    if (!doneQuestionnaire && !ableToSkipQuestionnaire) {
      navigate(RoutePath.WebQuestionnaire, {
        replace: true,
        state: { callbackPath: RoutePath.WebSessionAdd },
      });
    }
  }, [step, doneQuestionnaire, ableToSkipQuestionnaire, isQuestionnaireLoading, navigate]);

  const masterCandidates = useMemo<Account[]>(() => {
    if (!wallet) return [];
    return wallet.accounts.filter(isSessionMasterAccount);
  }, [wallet]);

  const hasMasterCandidate = masterCandidates.length > 0;

  const [tab, setTab] = useState<Tab>(hasMasterCandidate ? 'create' : 'import');
  const activeTab: Tab = hasMasterCandidate ? tab : 'import';
  const useCenteredFormLayout = step === 'FORM';

  const getSessionImportErrorReason = useCallback((e: unknown): SessionImportErrorReason => {
    if (e && typeof e === 'object' && 'reason' in (e as Record<string, unknown>)) {
      return (e as { reason: SessionImportErrorReason }).reason;
    }
    return 'network_error';
  }, []);

  const onFetchImportSessions = useCallback(
    async (
      masterAddress: string,
    ): Promise<{ ok: true; sessions: SessionImportCandidate[] } | { ok: false; error: string }> => {
      if (!currentNetwork) {
        return { ok: false, error: errorMessageOf('unsupported_network') };
      }
      try {
        const sessions = await walletSessionService.listImportableSessions(
          masterAddress,
          currentNetwork,
        );
        return { ok: true, sessions };
      } catch (e) {
        const reason = getSessionImportErrorReason(e);
        return { ok: false, error: errorMessageOf(reason) };
      }
    },
    [
      currentNetwork,
      walletSessionService,
      errorMessageOf,
      getSessionImportErrorReason,
    ],
  );

  // Import handler that branches on wallet presence:
  //   - wallet exists: commit all selected sessions to the current vault.
  //   - no wallet: bootstrap a pending wallet that contains all selected
  //     sessions, then save it through WebCreatePassword.
  const onImport = useCallback(
    async (
      requests: SessionImportRequest[],
      masterAddress: string,
    ): Promise<
      | { ok: true }
      | { ok: false; error: string; errorBySessionAddr?: Record<string, string> }
    > => {
      if (!currentNetwork) {
        return { ok: false, error: errorMessageOf('unsupported_network') };
      }

      const previews: SessionImportPreview[] = [];
      const privKeyBySessionAddr: Record<string, string> = {};
      const errorBySessionAddr: Record<string, string> = {};
      for (const request of requests) {
        try {
          const preview = await walletSessionService.previewSessionImportForAddress(
            request.privKey,
            masterAddress,
            request.sessionAddr,
            currentNetwork,
          );
          previews.push(preview);
          privKeyBySessionAddr[request.sessionAddr] = request.privKey;
        } catch (e) {
          const reason = getSessionImportErrorReason(e);
          errorBySessionAddr[request.sessionAddr] = errorMessageOf(reason);
        }
      }

      if (Object.keys(errorBySessionAddr).length > 0) {
        return {
          ok: false,
          error: 'Some sessions failed validation.',
          errorBySessionAddr,
        };
      }

      if (wallet) {
        try {
          await walletSessionService.commitSessionImports(
            previews,
            currentNetwork,
            privKeyBySessionAddr,
          );
          navigate(RoutePath.WebAccountAddedComplete);
          return { ok: true };
        } catch (e) {
          const reason = getSessionImportErrorReason(e);
          return { ok: false, error: errorMessageOf(reason) };
        }
      }

      try {
        const bootstrap = await walletSessionService.bootstrapSessionImportPreviews(
          previews,
          currentNetwork,
          privKeyBySessionAddr,
        );
        pendingWalletStore.set(bootstrap.wallet, { sessions: bootstrap.sessions });
        navigate(RoutePath.WebCreatePassword);
        return { ok: true };
      } catch (e) {
        const reason = getSessionImportErrorReason(e);
        return { ok: false, error: errorMessageOf(reason) };
      }
    },
    [
      wallet,
      currentNetwork,
      walletSessionService,
      errorMessageOf,
      navigate,
      getSessionImportErrorReason,
    ],
  );

  return (
    <WebMain
      spacing={useCenteredFormLayout ? null : SESSION_ADD_TOP_SPACING}
      responsiveSpacing={useCenteredFormLayout ? null : SESSION_ADD_TOP_SPACING_RESPONSIVE}
      style={{
        height: 'auto',
        minHeight: 'calc(100vh - 80px)',
        paddingTop: useCenteredFormLayout ? SESSION_ADD_FORM_MIN_TOP_PADDING : undefined,
        paddingBottom: 80,
      }}
    >
      <WebMainHeader
        stepLength={0}
        onClickGoBack={
          step === 'FORM'
            ? (): void => setStep('INIT')
            : (): void => navigate(RoutePath.WebAdvancedSetup)
        }
      />

      {step === 'INIT' && (
        <SensitiveInfoStep
          desc={
            'Session accounts use temporary, scoped keys to access your master account.\nKeep your session key secure and only grant access to trusted parties.'
          }
          onClickNext={(): void => setStep('FORM')}
          link={`${ADENA_DOCS_PAGE}/user-guide/sign-in`}
        />
      )}

      {step === 'FORM' && (
        <>
          <WebTitleWithDescription
            title='Add Session Account'
            description='Recover your session account or create a new one.'
          />

          {hasMasterCandidate && (
            <TabRow>
              <TabButton
                $active={activeTab === 'create'}
                onClick={(): void => setTab('create')}
              >
                Create New Session
              </TabButton>
              <TabButton $active={activeTab === 'import'} onClick={(): void => setTab('import')}>
                Import Existing Session
              </TabButton>
            </TabRow>
          )}

          {activeTab === 'create' && hasMasterCandidate && (
            <CreateTab
              masterCandidates={masterCandidates}
              currentChainId={currentNetwork?.chainId ?? ''}
              onComplete={(): void => navigate(RoutePath.WebAccountAddedComplete)}
            />
          )}

          {activeTab === 'import' && (
            <ImportTab
              masterAddress={sessionImport.masterAddress}
              setMasterAddress={sessionImport.setMasterAddress}
              currentAddressPrefix={currentNetwork?.addressPrefix ?? ''}
              onFetchSessions={onFetchImportSessions}
              onImport={onImport}
            />
          )}
        </>
      )}
    </WebMain>
  );
};

interface CreateTabProps {
  masterCandidates: Account[];
  currentChainId: string;
  onComplete: () => void;
}

const SESSION_CREATE_CONFIRMATION_DELAYS_MS = [0, 1_500, 3_000, 5_000] as const;
const SESSION_ADD_TOP_SPACING = 220;
const SESSION_ADD_TOP_SPACING_RESPONSIVE = 120;
const SESSION_ADD_FORM_MIN_TOP_PADDING = 80;

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const waitForCreatedSessionOnChain = async (
  gnoProvider:
    | {
        getSession?: (masterAddr: string, sessionAddr: string) => Promise<unknown>;
      }
    | null
    | undefined,
  masterAddr: string,
  sessionAddr: string,
): Promise<boolean> => {
  if (!gnoProvider?.getSession) {
    return false;
  }

  for (const delayMs of SESSION_CREATE_CONFIRMATION_DELAYS_MS) {
    if (delayMs > 0) {
      await wait(delayMs);
    }

    const session = await gnoProvider.getSession(masterAddr, sessionAddr).catch(() => {
      // Confirmation polling is best-effort; treat query failures as "not yet".
      return null;
    });
    if (session) {
      return true;
    }
  }

  return false;
};

const hexToBytes = (hex: string): Uint8Array => {
  const clean = hex.trim().toLowerCase().replace(/^0x/, '');
  // Session private keys are 32 bytes; enforce that before delegating the
  // decode to adena-module's validated fromHex helper.
  if (clean.length !== 64 || !/^[0-9a-f]+$/.test(clean)) {
    throw new Error('invalid_private_key');
  }
  return fromHex(clean);
};

// Spawn approve-transaction popup from the web tab and wait for its
// response over chrome.runtime.onMessage. Matches the same query-string
// shape used by createPopup() in inject/message/methods/common.ts so the
// existing ApproveTransaction popup can be reused as-is.
//
// session private key NEVER crosses into the popup payload, only the
// pre-built MsgCreateSession (which already contains session pubkey).
const approveSessionViaPopup = (
  message: { type: string; value: unknown },
  gasWanted: number,
  gasFeeUgnot: number,
  chainId: string,
  rpcUrl: string,
  signerAccountId: string,
): Promise<{ ok: true; hash?: string } | { ok: false; reason: string }> => {
  const requestKey =
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);

  const injectionMessage = {
    code: 0,
    key: requestKey,
    type: 'DO_CONTRACT',
    status: 'request',
    message: '',
    withNotification: false,
    hostname: 'adena-wallet',
    protocol: 'extension',
    data: {
      messages: [message],
      memo: '',
      gasWanted,
      gasFee: gasFeeUgnot,
      networkInfo: { chainId, rpcUrl },
      signerAccountId,
      commit: true,
    },
  };

  const encoded = encodeParameter(injectionMessage);
  if (!encoded) {
    return Promise.resolve({
      ok: false,
      reason: 'Failed to encode session approval request.',
    });
  }

  const popupPath = '/approve/wallet/transaction';
  const url = chrome.runtime.getURL(
    `popup.html#${popupPath}?key=${requestKey}` +
      `&hostname=adena-wallet&protocol=extension&data=${encoded}`,
  );

  return new Promise((resolve) => {
    let resolved = false;
    let popupId: number | undefined;

    const settle = (
      result: { ok: true; hash?: string } | { ok: false; reason: string },
    ): void => {
      if (resolved) return;
      resolved = true;
      chrome.runtime.onMessage.removeListener(messageListener);
      chrome.windows.onRemoved.removeListener(removedListener);
      if (popupId !== undefined) {
        chrome.windows.remove(popupId).catch(() => undefined);
      }
      resolve(result);
    };

    const messageListener = (msg: {
      key?: string;
      status?: string;
      message?: string;
      data?: { hash?: string; error?: string; log?: string };
    }): void => {
      if (!msg || msg.key !== requestKey) return;
      if (msg.status === 'success') {
        settle({ ok: true, hash: msg.data?.hash });
      } else {
        const reason =
          msg.data?.log || msg.data?.error || msg.message || msg.status || 'popup_rejected';
        settle({
          ok: false,
          reason,
        });
      }
    };

    const removedListener = (windowId: number): void => {
      if (windowId !== popupId) return;
      settle({ ok: false, reason: 'popup_closed' });
    };

    chrome.runtime.onMessage.addListener(messageListener);
    chrome.windows.onRemoved.addListener(removedListener);

    chrome.windows.create(
      { url, type: 'popup', height: 590, width: 380, left: 800, top: 300 },
      (window) => {
        popupId = window?.id;
      },
    );
  });
};

// Normalize GNOT amount input. Mirrors the leading-zero / decimal-clamp
// behavior of use-balance-input.onChangeAmount, but accepts 0 and empty.
const normalizeGnotInput = (raw: string): string => {
  if (raw === '') return '';
  if (!/^[0-9]*\.?[0-9]*$/.test(raw)) return raw.replace(/[^0-9.]/g, '');

  let next: string = raw;
  const first = next.charAt(0);
  const second = next.charAt(1);
  if (first === '0' && second !== '' && second !== '.') {
    next = next.replace(/^0+/, '') || '0';
  } else if (first === '.') {
    next = `0${next}`;
  }
  if (next.includes('.')) {
    const [intPart, decPart = ''] = next.split('.');
    if (decPart.length > GNOT_TOKEN.decimals) {
      next = `${intPart}.${decPart.slice(0, GNOT_TOKEN.decimals)}`;
    }
  }
  return next;
};

const gnotToUgnotString = (gnotAmount: string): string => {
  return BigNumber(gnotAmount || '0')
    .shiftedBy(GNOT_TOKEN.decimals)
    .toFixed(0);
};

const toSpendLimitCoin = (gnotAmount: string): string => {
  const ugnot = gnotToUgnotString(gnotAmount);
  return ugnot === '0' ? '' : `${ugnot}ugnot`;
};

const CreateTab = ({
  masterCandidates,
  currentChainId,
  onComplete,
}: CreateTabProps): ReactElement => {
  const {
    sessionRepository,
    accountService,
    transactionService,
    transactionGasService,
  } = useAdenaContext();
  const { wallet, updateWallet, gnoProvider } = useWalletContext();
  const { changeCurrentAccount } = useCurrentAccount();
  const { currentNetwork } = useNetwork();
  const [sessionPrivKey] = useState<string>(generateSessionPrivateKeyHex);
  const [blurSessionKey, setBlurSessionKey] = useState(true);
  const [selectedMasterId, setSelectedMasterId] = useState<string>(masterCandidates[0]?.id ?? '');
  const [masterMenuOpen, setMasterMenuOpen] = useState(false);
  const [showMasterTooltip, setShowMasterTooltip] = useState(false);
  const [expiresDays, setExpiresDays] = useState<number>(DEFAULT_EXPIRES_DAYS);
  const [expiresMenuOpen, setExpiresMenuOpen] = useState(false);
  const masterSelectRef = useRef<HTMLDivElement | null>(null);
  const expiresSelectRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!masterMenuOpen && !expiresMenuOpen) return;
    const handleClickOutside = (event: MouseEvent): void => {
      const target = event.target as Node;
      if (masterMenuOpen && masterSelectRef.current && !masterSelectRef.current.contains(target)) {
        setMasterMenuOpen(false);
      }
      if (
        expiresMenuOpen &&
        expiresSelectRef.current &&
        !expiresSelectRef.current.contains(target)
      ) {
        setExpiresMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return (): void => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [masterMenuOpen, expiresMenuOpen]);
  const [spendLimit, setSpendLimit] = useState<string>(DEFAULT_SPEND_LIMIT_GNOT);
  const [spendPeriodValue, setSpendPeriodValue] = useState<string>('');
  const [spendPeriodUnit, setSpendPeriodUnit] = useState<SpendPeriodUnit>('days');
  const [showSpendTooltip, setShowSpendTooltip] = useState(false);
  const [realmPaths, setRealmPaths] = useState<string[]>(['']);
  const [disableTransfer, setDisableTransfer] = useState(false);
  const [showDisableTransferTooltip, setShowDisableTransferTooltip] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [realmErrors, setRealmErrors] = useState<Record<number, string>>({});
  const [validatingRealmIndexes, setValidatingRealmIndexes] = useState<Record<number, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');
  const realmPathsRef = useRef<string[]>(realmPaths);
  const realmValidationCacheRef = useRef<Map<string, RealmValidationResult>>(new Map());

  const isSupportedSessionAccount = useMemo(() => isSessionSupportedChainId(currentChainId), [currentChainId]);

  const selectedMaster = useMemo(
    () => masterCandidates.find((a) => a.id === selectedMasterId),
    [masterCandidates, selectedMasterId],
  );

  const [masterAddresses, setMasterAddresses] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      masterCandidates.map(async (a) => [a.id, await a.getAddress(GNO_PREFIX)] as const),
    ).then((entries) => {
      if (cancelled) return;
      setMasterAddresses(Object.fromEntries(entries));
    });
    return (): void => {
      cancelled = true;
    };
  }, [masterCandidates]);

  useEffect(() => {
    realmPathsRef.current = realmPaths;
  }, [realmPaths]);

  const maxRealmPaths = disableTransfer
    ? MAX_REALM_PATHS_GAS_ONLY
    : MAX_REALM_PATHS_TRANSFER_ENABLED;

  useEffect(() => {
    setRealmPaths((prev) => {
      if (prev.length <= maxRealmPaths) return prev;
      const next = prev.slice(0, maxRealmPaths);
      realmPathsRef.current = next;
      return next;
    });
    setRealmErrors((prev) => {
      const next: Record<number, string> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const i = Number(key);
        if (i < maxRealmPaths) next[i] = value;
      });
      return next;
    });
    setValidatingRealmIndexes((prev) => {
      const next: Record<number, boolean> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const i = Number(key);
        if (i < maxRealmPaths) next[i] = value;
      });
      return next;
    });
  }, [maxRealmPaths]);

  const setRealmErrorAt = useCallback((idx: number, error: string) => {
    setRealmErrors((prev) => {
      const next = { ...prev };
      if (error) {
        next[idx] = error;
      } else {
        delete next[idx];
      }
      return next;
    });
  }, []);

  const setRealmValidatingAt = useCallback((idx: number, validating: boolean) => {
    setValidatingRealmIndexes((prev) => {
      const next = { ...prev };
      if (validating) {
        next[idx] = true;
      } else {
        delete next[idx];
      }
      return next;
    });
  }, []);

  const applyRealmValidationResult = useCallback(
    (idx: number, path: string, result: RealmValidationResult): boolean => {
      if ((realmPathsRef.current[idx] ?? '').trim() !== path) {
        return false;
      }
      setRealmErrorAt(idx, result.ok ? '' : result.error);
      return result.ok;
    },
    [setRealmErrorAt],
  );

  const validateRealmPathAt = useCallback(
    async (idx: number): Promise<boolean> => {
      const path = (realmPathsRef.current[idx] ?? '').trim();
      if (!path) {
        setRealmErrorAt(idx, '');
        return true;
      }

      if (!isSessionPathInputValid(path)) {
        setRealmErrorAt(idx, REALM_PATH_FORMAT_ERROR);
        return false;
      }

      if (isSessionAllowPathRouteType(path)) {
        setRealmErrorAt(idx, '');
        return true;
      }

      if (!gnoProvider) {
        setRealmErrorAt(idx, REALM_VALIDATION_ERROR);
        return false;
      }

      const cacheKey = `${currentNetwork?.chainId ?? 'unknown'}:${path}`;
      const cached = realmValidationCacheRef.current.get(cacheKey);
      if (cached) {
        return applyRealmValidationResult(idx, path, cached);
      }

      setRealmValidatingAt(idx, true);
      let result: RealmValidationResult;
      try {
        const document = await gnoProvider.getRealmDocument(path);
        result = document ? { ok: true } : { ok: false, error: REALM_NOT_FOUND_ERROR };
        realmValidationCacheRef.current.set(cacheKey, result);
      } catch {
        result = { ok: false, error: REALM_VALIDATION_ERROR };
      } finally {
        setRealmValidatingAt(idx, false);
      }

      return applyRealmValidationResult(idx, path, result);
    },
    [
      applyRealmValidationResult,
      currentNetwork?.chainId,
      gnoProvider,
      setRealmErrorAt,
      setRealmValidatingAt,
    ],
  );

  const validateAllRealmPaths = useCallback(async (): Promise<boolean> => {
    const results = await Promise.all(
      realmPathsRef.current.map((_, idx) => validateRealmPathAt(idx)),
    );
    return results.every(Boolean);
  }, [validateRealmPathAt]);

  const onChangeRealm = useCallback((idx: number, value: string) => {
    const sanitized = sanitizeRealmPathInput(value);
    const nextPaths = [...realmPathsRef.current];
    nextPaths[idx] = sanitized;
    realmPathsRef.current = nextPaths;
    setRealmPaths(nextPaths);
    setRealmErrors((prev) => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
    setValidatingRealmIndexes((prev) => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  }, []);

  const onAddRealm = useCallback(() => {
    setRealmPaths((prev) => {
      const next = prev.length >= maxRealmPaths ? prev : [...prev, ''];
      realmPathsRef.current = next;
      return next;
    });
  }, [maxRealmPaths]);

  const onRemoveRealm = useCallback((idx: number) => {
    setRealmPaths((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      realmPathsRef.current = next;
      return next;
    });
    setRealmErrors((prev) => {
      const next: Record<number, string> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const current = Number(key);
        if (current < idx) {
          next[current] = value;
        } else if (current > idx) {
          next[current - 1] = value;
        }
      });
      return next;
    });
    setValidatingRealmIndexes((prev) => {
      const next: Record<number, boolean> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const current = Number(key);
        if (current < idx) {
          next[current] = value;
        } else if (current > idx) {
          next[current - 1] = value;
        }
      });
      return next;
    });
  }, []);

  const expirationValid = useMemo(() => {
    return Number.isInteger(expiresDays) && expiresDays >= 1 && expiresDays <= MAX_EXPIRES_DAYS;
  }, [expiresDays]);

  const expiresSeconds = useMemo(() => expiresDays * SECONDS_PER_DAY, [expiresDays]);

  // Spend Period is optional: empty input is treated as 0 (lifetime
  // cumulative per gno auth module).
  const spendPeriodSecondsNum = useMemo(() => {
    if (spendPeriodValue.trim() === '') return 0;
    const n = Number(spendPeriodValue);
    if (!Number.isFinite(n) || n < 0) return Number.NaN;
    return spendPeriodUnit === 'days' ? n * SECONDS_PER_DAY : n * SECONDS_PER_HOUR;
  }, [spendPeriodValue, spendPeriodUnit]);

  const spendPeriodError = useMemo<string>(() => {
    if (spendPeriodValue.trim() === '') return '';
    if (!Number.isFinite(spendPeriodSecondsNum)) return 'Enter a valid number.';
    if (spendPeriodSecondsNum > MAX_SPEND_PERIOD_SECONDS) {
      return 'Must be less than total session time.';
    }
    if (spendPeriodSecondsNum > expiresSeconds) {
      return 'Must be less than total session time.';
    }
    return '';
  }, [spendPeriodValue, spendPeriodSecondsNum, expiresSeconds]);

  const spendPeriodValid = spendPeriodError === '';

  // Spend Limit: GNOT-denominated, non-negative. Per upstream gno
  // tm2/pkg/sdk/auth/spend.go, "0ugnot" (or empty SpendLimit) rejects any
  // non-zero spend, gas-only / read-only session. Empty input rejected;
  // user must type 0 explicitly to opt into the no-spend path.
  const spendLimitValid = useMemo(() => {
    if (spendLimit.trim() === '') return false;
    const n = BigNumber(spendLimit);
    return n.isFinite() && n.isGreaterThanOrEqualTo(0);
  }, [spendLimit]);

  const realmsValid = useMemo(() => {
    const trimmed = realmPaths.map((p) => p.trim()).filter((p) => p.length > 0);
    if (trimmed.some((p) => !isSessionPathInputValid(p))) {
      return false;
    }
    return trimmed.length <= maxRealmPaths;
  }, [realmPaths, maxRealmPaths]);

  const hasRealmErrors = Object.keys(realmErrors).length > 0;
  const hasValidatingRealms = Object.keys(validatingRealmIndexes).length > 0;

  const canSubmit =
    isSupportedSessionAccount &&
    !!selectedMasterId &&
    expirationValid &&
    spendLimitValid &&
    spendPeriodValid &&
    realmsValid &&
    !hasRealmErrors &&
    !hasValidatingRealms &&
    acknowledged;

  const onClickCreate = useCallback(async () => {
    if (!wallet) return;
    setSubmitError('');
    if (!isSupportedSessionAccount) {
      setSubmitError('Session accounts are not supported on this network.');
      return;
    }
    const realmPathsOk = await validateAllRealmPaths();
    if (!realmPathsOk) {
      return;
    }
    setSubmitting(true);
    try {
      const masterAccount = masterCandidates.find((a) => a.id === selectedMasterId);
      if (!masterAccount) throw new Error('Master account not found.');

      const sessionPrivKeyBytes = hexToBytes(sessionPrivKey);
      const sessionTm2 = await Tm2Wallet.fromPrivateKey(sessionPrivKeyBytes);
      const sessionPublicKey = await sessionTm2.getSigner().getPublicKey();
      const masterAddress = await masterAccount.getAddress(GNO_PREFIX);
      const sessionAddr = await publicKeyToAddress(sessionPublicKey, GNO_PREFIX);

      const trimmedRealmPaths = realmPaths
        .slice(0, maxRealmPaths)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      const userPaths = trimmedRealmPaths.map(toSessionAllowPath);
      const hasUserPaths = userPaths.length > 0;
      let allowPaths: string[];
      if (disableTransfer) {
        // Toggle ON: gas-only. No bank entries; vm/exec + vm/run when empty.
        allowPaths = hasUserPaths ? userPaths : ['vm/exec', 'vm/run'];
      } else {
        // Toggle OFF (default): prepend bank/send + bank/multisend when user
        // entered paths, otherwise full wildcard.
        allowPaths = hasUserPaths
          ? Array.from(new Set(['bank/send', 'bank/multisend', ...userPaths]))
          : [ALLOW_PATHS_WILDCARD];
      }
      const expiresAtSec = Math.floor(Date.now() / 1000) + expiresDays * SECONDS_PER_DAY;
      const spendLimitCoin = toSpendLimitCoin(spendLimit);
      const spendPeriodSec = spendPeriodSecondsNum;

      const message = createMessageOfCreateSession({
        creator: masterAddress,
        sessionPublicKey,
        expiresAt: expiresAtSec,
        allowPaths,
        spendLimit: spendLimitCoin,
        spendPeriod: spendPeriodSec,
      });

      // Switch currentAccount to the selected master so the popup signs
      // with it. ApproveTransaction uses useCurrentAccount + validates
      // the message's creator/from_address matches that account's address.
      if (wallet.currentAccount.id !== masterAccount.id) {
        await accountService.changeCurrentAccount(masterAccount);
      }

      const createGasInfo = await resolveSessionAdminGasInfo({
        gnoProvider,
        transactionService,
        transactionGasService,
        masterAccount,
        chainId: currentChainId,
        message,
      });
      const popupResult = await approveSessionViaPopup(
        message,
        createGasInfo.gasWanted,
        createGasInfo.gasFeeUgnot,
        currentChainId,
        currentNetwork?.rpcUrl ?? '',
        masterAccount.id,
      );

      if (!popupResult.ok) {
        setSubmitError(popupResult.reason);
        return;
      }

      const sessionFoundOnChain = await waitForCreatedSessionOnChain(
        gnoProvider,
        masterAddress,
        sessionAddr,
      );
      if (!sessionFoundOnChain) {
        setSubmitError(
          'Session creation was broadcast, but the session was not found on chain. Please try again or import it after the chain shows the session.',
        );
        return;
      }

      // Commit: build SessionKeyring/SessionAccount and persist now that
      // the chain committed MsgCreateSession. Failure here is "chain OK,
      // wallet save NOT OK"; surface the session private key so the user
      // can recover via the Import tab.
      const sessionKeyring = new SessionKeyring({
        publicKey: Array.from(sessionPublicKey),
        privateKey: Array.from(sessionPrivKeyBytes),
        masterAddress,
      });
      const sessionConfig: SessionConfig = {
        masterAddress,
        chainId: currentChainId,
        status: 'ACTIVE',
        expiresAt: expiresAtSec,
        allowPaths,
        spendLimit: spendLimitCoin,
        spendPeriod: spendPeriodSec,
      };
      const sessionAccount = SessionAccount.createBy(
        sessionKeyring,
        wallet.nextSessionAccountName,
        sessionConfig,
      );
      const sessionMetadata = {
        masterAddress,
        chainId: currentChainId,
        allowPaths,
        spendLimit: spendLimitCoin,
        spendPeriod: spendPeriodSec,
        expiresAt: expiresAtSec,
        status: 'ACTIVE' as const,
        createdAt: Math.floor(Date.now() / 1000),
        txHash: popupResult.hash,
      };
      const cloned = wallet.clone();
      cloned.addKeyring(sessionKeyring);
      cloned.addAccount(sessionAccount);
      cloned.currentAccountId = sessionAccount.id;
      await sessionRepository.set(sessionAddr, sessionMetadata);
      try {
        await updateWallet(cloned);
      } catch (e) {
        await sessionRepository.remove(sessionAddr).catch(() => undefined);
        throw e;
      }
      await changeCurrentAccount(sessionAccount);

      onComplete();
    } catch (e) {
      // Surface chain's full diagnostic Log. tm2-js-client puts it on
      // err.log (separate from err.message which is just the static
      // category like "unknown request error"). Without this, errors
      // from chain handlers (e.g. baseapp.go:657, auth/handler.go:38)
      // are indistinguishable in the UI.
      const err = e as { message?: string; log?: string };
      setSubmitError(
        (err.log ? `${err.message ?? 'broadcast failed'}\n${err.log}` : err.message)
          ?? 'Failed to create session account.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    wallet,
    updateWallet,
    accountService,
    sessionRepository,
    transactionService,
    transactionGasService,
    changeCurrentAccount,
    gnoProvider,
    masterCandidates,
    selectedMasterId,
    sessionPrivKey,
    realmPaths,
    disableTransfer,
    maxRealmPaths,
    expiresDays,
    spendLimit,
    spendPeriodSecondsNum,
    validateAllRealmPaths,
    currentChainId,
    currentNetwork?.chainId,
    currentNetwork?.rpcUrl,
    onComplete,
  ]);

  const otherUnit: SpendPeriodUnit = spendPeriodUnit === 'days' ? 'hours' : 'days';
  const unitLabel = spendPeriodUnit === 'days' ? 'Days' : 'Hours';

  return (
    <Card>
      {!isSupportedSessionAccount && (
        <WebWarningDescriptionBox description='Session creation is not supported on this network. Please switch to a supported network.' />
      )}

      <SelectField ref={masterSelectRef}>
        <MasterLabelCell>
          <span>Master</span>
          <MasterLabelInfoIcon
            onMouseEnter={(): void => setShowMasterTooltip(true)}
            onMouseLeave={(): void => setShowMasterTooltip(false)}
          >
            <svg
              width='16'
              height='16'
              viewBox='0 0 16 16'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                d='M8 8.667V10'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
              <circle cx='8' cy='6' r='0.5' fill='currentColor' />
              <circle
                cx='8'
                cy='8'
                r='5'
                stroke='currentColor'
                strokeWidth='1.25'
              />
            </svg>
          </MasterLabelInfoIcon>
        </MasterLabelCell>
        {showMasterTooltip && (
          <MasterTooltipBox $placement='top'>
            The Session Account will control this account with limited scope and time.
          </MasterTooltipBox>
        )}
        <SelectTrigger
          type='button'
          onClick={(): void => setMasterMenuOpen((v) => !v)}
        >
          {selectedMaster ? (
            <Row style={{ columnGap: 6, alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>{selectedMaster.name}</span>
              {masterAddresses[selectedMaster.id] && (
                <span style={{ color: '#51555c' }}>
                  {`(${truncateAddress(masterAddresses[selectedMaster.id])})`}
                </span>
              )}
            </Row>
          ) : (
            <span style={{ color: '#51555c' }}>
              Select an account to serve as the Master Account.
            </span>
          )}
          <DropdownChevronIcon />
        </SelectTrigger>
        {masterMenuOpen && (
          <SelectMenu style={{ left: 0, right: 0 }}>
            {masterCandidates.map((a) => (
              <SelectOption
                key={a.id}
                type='button'
                $active={a.id === selectedMasterId}
                $align='start'
                onClick={(): void => {
                  setSelectedMasterId(a.id);
                  setMasterMenuOpen(false);
                }}
              >
                <Row style={{ columnGap: 6, alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{a.name}</span>
                  {masterAddresses[a.id] && (
                    <span style={{ color: '#51555c', fontWeight: 400 }}>
                      {`(${truncateAddress(masterAddresses[a.id])})`}
                    </span>
                  )}
                </Row>
              </SelectOption>
            ))}
          </SelectMenu>
        )}
      </SelectField>

      <ConfigureCard>
        <WebText type='body4'>Configure Your Session Account</WebText>

        <Field>
          <WebText type='body5' color='#878D99'>
            This session will be active for
          </WebText>
          <SelectField ref={expiresSelectRef}>
            <SelectTrigger
              type='button'
              onClick={(): void => setExpiresMenuOpen((v) => !v)}
            >
              <Row style={{ columnGap: 6, alignItems: 'center' }}>
                <span>{`${expiresDays} ${expiresDays === 1 ? 'day' : 'days'}`}</span>
                <span style={{ color: '#51555c' }}>{`(${formatExpiryLabel(expiresDays)})`}</span>
              </Row>
              <DropdownChevronIcon />
            </SelectTrigger>
            {expiresMenuOpen && (
              <SelectMenu>
                {EXPIRES_DAY_OPTIONS.map((d) => (
                  <SelectOption
                    key={d}
                    type='button'
                    $active={d === expiresDays}
                    onClick={(): void => {
                      setExpiresDays(d);
                      setExpiresMenuOpen(false);
                    }}
                  >
                    <span>{`${d} ${d === 1 ? 'day' : 'days'}`}</span>
                    <span style={{ color: '#51555c' }}>{formatExpiryLabel(d)}</span>
                  </SelectOption>
                ))}
              </SelectMenu>
            )}
          </SelectField>
        </Field>

        <WebWarningDescriptionBox description='You can export this session account to use it as a regular account before or after it expires.' />

        <Field>
          <Row
            style={{
              width: '100%',
              columnGap: 8,
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <WebText type='body5' color='#878D99'>
              It may spend up to
            </WebText>
            <Row style={{ columnGap: 6, alignItems: 'center' }}>
              <TooltipWrapper
                onMouseEnter={(): void => setShowDisableTransferTooltip(true)}
                onMouseLeave={(): void => setShowDisableTransferTooltip(false)}
              >
                <svg
                  width='16'
                  height='16'
                  viewBox='0 0 16 16'
                  fill='none'
                  xmlns='http://www.w3.org/2000/svg'
                  style={{ color: '#878D99' }}
                >
                  <circle cx='8' cy='8' r='6' stroke='currentColor' strokeWidth='1.25' />
                  <path
                    d='M8 7.5V11'
                    stroke='currentColor'
                    strokeWidth='1.5'
                    strokeLinecap='round'
                  />
                  <circle cx='8' cy='5.25' r='0.6' fill='currentColor' />
                </svg>
                {showDisableTransferTooltip && (
                  <TooltipBoxAbove>
                    When checked, GNOT can only be used for gas fees.
                  </TooltipBoxAbove>
                )}
              </TooltipWrapper>
              <WebText type='body5' color='#878D99'>
                Disable transfer
              </WebText>
              <DisableTransferToggleWrapper>
                <Toggle activated={disableTransfer} onToggle={setDisableTransfer} />
              </DisableTransferToggleWrapper>
            </Row>
          </Row>
          <AmountInputWrapper>
            <AmountInput
              type='text'
              inputMode='decimal'
              value={spendLimit}
              onChange={(e): void => setSpendLimit(normalizeGnotInput(e.target.value))}
              placeholder='0'
            />
            <span style={{ color: '#51555c', fontSize: 14 }}>GNOT</span>
          </AmountInputWrapper>
        </Field>

        <Field>
          <Row style={{ columnGap: 4, alignItems: 'center' }}>
            <WebText type='body5' color='#878D99'>
              In every
            </WebText>
            <TooltipWrapper
              onMouseEnter={(): void => setShowSpendTooltip(true)}
              onMouseLeave={(): void => setShowSpendTooltip(false)}
            >
              <svg
                width='16'
                height='16'
                viewBox='0 0 16 16'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
                style={{ color: '#878D99' }}
              >
                <circle cx='8' cy='8' r='6' stroke='currentColor' strokeWidth='1.25' />
                <path
                  d='M8 7.5V11'
                  stroke='currentColor'
                  strokeWidth='1.5'
                  strokeLinecap='round'
                />
                <circle cx='8' cy='5.25' r='0.6' fill='currentColor' />
              </svg>
              {showSpendTooltip && (
                <TooltipBox>
                  Your spending limit resets to the full amount after this duration.
                </TooltipBox>
              )}
            </TooltipWrapper>
          </Row>
          <SpendPeriodInputWrapper $hasError={!!spendPeriodError}>
            <SpendPeriodInput
              type='text'
              inputMode='numeric'
              value={spendPeriodValue}
              onChange={(e): void => {
                const raw = e.target.value.replace(/[^0-9]/g, '');
                setSpendPeriodValue(raw);
              }}
              placeholder='Enter a time period. Leave this empty for a one-time limit.'
            />
            <UnitToggle
              type='button'
              onClick={(): void => setSpendPeriodUnit(otherUnit)}
            >
              <span>{unitLabel}</span>
              <ChangeUnitIcon />
            </UnitToggle>
          </SpendPeriodInputWrapper>
          {spendPeriodError && (
            <InlineErrorRow>
              <WebImg src={IconError} size={20} />
              <WebText type='body5' color='#EB545E'>
                {spendPeriodError}
              </WebText>
            </InlineErrorRow>
          )}
        </Field>

        <Field>
          <WebText type='body5' color='#878D99'>
            It can interact with
          </WebText>
          {realmPaths.slice(0, maxRealmPaths).map((p, idx, visiblePaths) => {
            const hasError = !!realmErrors[idx];
            const isLast = idx === visiblePaths.length - 1;
            const canAddMore = visiblePaths.length < maxRealmPaths;
            return (
              <View key={idx} style={{ width: '100%', rowGap: 5 }}>
                <Row style={{ columnGap: 10, alignItems: 'flex-start' }}>
                  <RealmInputBox $hasError={hasError}>
                    <RealmInputInner
                      value={p}
                      onChange={(e): void => onChangeRealm(idx, e.target.value)}
                      onBlur={(): void => {
                        void validateRealmPathAt(idx);
                      }}
                      placeholder='Enter a realm path. Leave this empty to allow all realms.'
                    />
                  </RealmInputBox>
                  {isLast && canAddMore ? (
                    <IconButton type='button' onClick={onAddRealm} aria-label='Add realm'>
                      <PlusIcon />
                    </IconButton>
                  ) : (
                    <IconButton
                      type='button'
                      onClick={(): void => onRemoveRealm(idx)}
                      aria-label='Remove realm'
                      disabled={visiblePaths.length === 1}
                    >
                      <MinusIcon />
                    </IconButton>
                  )}
                </Row>
                {hasError && (
                  <InlineErrorRow>
                    <WebImg src={IconError} size={20} />
                    <WebText type='body5' color='#EB545E'>
                      {realmErrors[idx]}
                    </WebText>
                  </InlineErrorRow>
                )}
              </View>
            );
          })}
        </Field>
      </ConfigureCard>

      <WebWarningDescriptionBox description='This is the private key for your session account. Do not lose your private key! Anyone with your private key will have full control of your account. If your key is exposed or lost, be sure to revoke the session from your Master Account.' />

      <Field>
        <WebPrivateKeyBox privateKey={stringToBase64(sessionPrivKey)} showBlur={blurSessionKey} />
        <KeyActionRow>
          <WebHoldButton onFinishHold={(done): void => setBlurSessionKey(!done)} />
          <WebCopyButton width={80} copyText={sessionPrivKey} />
        </KeyActionRow>
      </Field>

      <Row style={{ columnGap: 8, alignItems: 'center' }}>
        <WebCheckBox
          checked={acknowledged}
          onClick={(): void => setAcknowledged(!acknowledged)}
        />
        <WebText type='body5' color='#878D99'>
          Your session key will only be stored on this device. Adena can&apos;t recover it for
          you.
        </WebText>
      </Row>

      {submitError && (
        <ErrorBanner>
          <WebImg src={IconError} size={20} />
          <WebText type='body6' color='rgba(235,84,94,0.9)'>
            {submitError}
          </WebText>
        </ErrorBanner>
      )}

      {submitting ? (
        <WebButton figure='primary' size='full' disabled onClick={(): void => undefined}>
          <Row style={{ columnGap: 6, alignItems: 'center', justifyContent: 'center' }}>
            <WebText type='title4' color='inherit'>
              Creating Session
            </WebText>
            <Spinner />
          </Row>
        </WebButton>
      ) : (
        <WebButton
          figure='primary'
          size='full'
          text='Create Session Account'
          disabled={!canSubmit}
          onClick={(): void => {
            onClickCreate();
          }}
        />
      )}
    </Card>
  );
};

interface ImportTabProps {
  masterAddress: string;
  setMasterAddress: (v: string) => void;
  currentAddressPrefix: string;
  onFetchSessions: (
    masterAddress: string,
  ) => Promise<{ ok: true; sessions: SessionImportCandidate[] } | { ok: false; error: string }>;
  onImport: (
    requests: SessionImportRequest[],
    masterAddress: string,
  ) => Promise<
    | { ok: true }
    | { ok: false; error: string; errorBySessionAddr?: Record<string, string> }
  >;
}

type ImportSessionRow = SessionImportCandidate & {
  privKey: string;
  error: string;
  selected: boolean;
};

interface MasterAddressInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hasError?: boolean;
}

const MasterAddressInput = ({
  value,
  onChange,
  placeholder,
  hasError,
}: MasterAddressInputProps): ReactElement => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <MasterAddressWrapper>
      <MasterInputRow $hasError={hasError}>
        <MasterLabelArea $hasError={hasError}>
          <span>Master</span>
          <MasterInfoIcon
            onMouseEnter={(): void => setShowTooltip(true)}
            onMouseLeave={(): void => setShowTooltip(false)}
          >
            <svg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'>
              <path d='M10 10.834V12.5007' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
              <path d='M10.4173 7.50065C10.4173 7.73077 10.2308 7.91732 10.0007 7.91732C9.77053 7.91732 9.58398 7.73077 9.58398 7.50065C9.58398 7.27053 9.77053 7.08398 10.0007 7.08398C10.2308 7.08398 10.4173 7.27053 10.4173 7.50065Z' stroke='currentColor' />
              <path d='M16.0423 10.0007C16.0423 13.3374 13.3374 16.0423 10.0007 16.0423C6.66393 16.0423 3.95898 13.3374 3.95898 10.0007C3.95898 6.66393 6.66393 3.95898 10.0007 3.95898C13.3374 3.95898 16.0423 6.66393 16.0423 10.0007Z' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
          </MasterInfoIcon>
        </MasterLabelArea>
        <MasterInputField
          value={value}
          onChange={(e): void => onChange(sanitizeMasterAddressInput(e.target.value))}
          placeholder={placeholder}
          maxLength={MASTER_ADDRESS_LENGTH}
          spellCheck={false}
        />
      </MasterInputRow>
      {showTooltip && (
        <MasterTooltipBox $placement='top'>
          The Session Account will control this account with limited scope and time.
        </MasterTooltipBox>
      )}
    </MasterAddressWrapper>
  );
};

const truncateAddress = (addr: string): string => {
  if (addr.length <= 13) return addr;
  return `${addr.slice(0, 7)}...${addr.slice(-6)}`;
};

const ImportTab = ({
  masterAddress,
  setMasterAddress,
  currentAddressPrefix,
  onFetchSessions,
  onImport,
}: ImportTabProps): ReactElement => {
  const [error, setError] = useState<string>('');
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ImportSessionRow[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);

  const trimmedMasterAddress = masterAddress.trim();
  const masterAddressValid = useMemo(() => {
    if (trimmedMasterAddress.length !== MASTER_ADDRESS_LENGTH || !currentAddressPrefix) {
      return false;
    }
    return (
      validateAddress(trimmedMasterAddress) &&
      trimmedMasterAddress.startsWith(`${currentAddressPrefix}1`)
    );
  }, [trimmedMasterAddress, currentAddressPrefix]);

  useEffect(() => {
    setRows([]);
    setError('');
    setAcknowledged(false);
    if (trimmedMasterAddress.length < MASTER_ADDRESS_LENGTH) {
      setFetching(false);
      return undefined;
    }
    if (!masterAddressValid) {
      setFetching(false);
      setError(MASTER_ADDRESS_FORMAT_ERROR);
      return undefined;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setFetching(true);
      onFetchSessions(trimmedMasterAddress)
        .then((res) => {
          if (cancelled) return;
          if (!res.ok) {
            setRows([]);
            setError(res.error);
            return;
          }
          if (res.sessions.length === 0) {
            setRows([]);
            setError(NO_SESSION_FOUND_ERROR);
            return;
          }
          setRows(
            res.sessions.map((session) => ({
              ...session,
              privKey: '',
              error: '',
              selected: false,
            })),
          );
        })
        .finally(() => {
          if (!cancelled) {
            setFetching(false);
          }
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [trimmedMasterAddress, masterAddressValid, onFetchSessions]);

  const selectedRequests = useMemo<SessionImportRequest[]>(() => {
    return rows
      .filter(
        (row) =>
          row.selected &&
          !row.alreadyImported &&
          row.privKey.trim().length > 0,
      )
      .map((row) => ({
        sessionAddr: row.sessionAddr,
        privKey: row.privKey,
      }));
  }, [rows]);

  const canSubmit = selectedRequests.length > 0 && !loading && !fetching && acknowledged;

  const onToggleRow = useCallback((sessionAddr: string): void => {
    setRows((prev) =>
      prev.map((row) =>
        row.sessionAddr === sessionAddr && !row.alreadyImported
          ? { ...row, selected: !row.selected, error: '' }
          : row,
      ),
    );
  }, []);

  const onChangeRowPrivateKey = useCallback((sessionAddr: string, value: string): void => {
    const sanitized = sanitizeSessionPrivateKeyInput(value);
    setRows((prev) =>
      prev.map((row) =>
        row.sessionAddr === sessionAddr
          ? { ...row, privKey: sanitized, error: '' }
          : row,
      ),
    );
  }, []);

  const onClickImport = useCallback(async () => {
    setError('');
    if (selectedRequests.length === 0) {
      setError('Enter at least one session private key to import.');
      return;
    }
    setRows((prev) => prev.map((row) => ({ ...row, error: '' })));
    setLoading(true);
    const res = await onImport(selectedRequests, trimmedMasterAddress);
    setLoading(false);
    if (!res.ok) {
      if (res.errorBySessionAddr && Object.keys(res.errorBySessionAddr).length > 0) {
        const errorMap = res.errorBySessionAddr;
        setRows((prev) =>
          prev.map((row) =>
            errorMap[row.sessionAddr] ? { ...row, error: errorMap[row.sessionAddr] } : row,
          ),
        );
        return;
      }
      setError(res.error);
    }
  }, [selectedRequests, trimmedMasterAddress, onImport]);

  return (
    <View style={{ width: '100%', rowGap: 16 }}>
      <MasterAddressInput
        value={masterAddress}
        onChange={setMasterAddress}
        placeholder='Enter the address of the Master Account.'
        hasError={!!error && rows.length === 0}
      />

      {fetching && (
        <WebText type='body6' color='rgba(255,255,255,0.55)' style={{ textAlign: 'center' }}>
          Loading session accounts…
        </WebText>
      )}

      {rows.length > 0 && (
        <SessionRows>
          {rows.map((row, index) => {
            const rowDisabled = row.alreadyImported;
            return (
              <View key={row.sessionAddr} style={{ rowGap: 6 }}>
                <SessionCard $hasError={!!row.error}>
                  <SessionCardHeader
                    $disabled={rowDisabled}
                    onClick={(): void => {
                      onToggleRow(row.sessionAddr);
                    }}
                  >
                    <Row style={{ columnGap: 8, alignItems: 'center', flex: 1, minWidth: 0 }}>
                      <WebText type='body5' style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                        {`Session #${index + 1}`}
                      </WebText>
                      <ImportSessionAddress>
                        {truncateAddress(row.sessionAddr)}
                      </ImportSessionAddress>
                    </Row>
                    {row.alreadyImported ? (
                      <WebText
                        type='body6'
                        color='rgba(255,255,255,0.35)'
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        Imported
                      </WebText>
                    ) : (
                      <WebCheckBox checked={row.selected} />
                    )}
                  </SessionCardHeader>
                  {row.selected && !row.alreadyImported && (
                    <SessionCardBody>
                      <WebTextarea
                        value={row.privKey}
                        onChange={(e): void =>
                          onChangeRowPrivateKey(row.sessionAddr, e.target.value)
                        }
                        placeholder='Private Key'
                        error={!!row.error}
                        rows={2}
                        style={{ width: '100%' }}
                      />
                    </SessionCardBody>
                  )}
                </SessionCard>
                {row.error && (
                  <Row style={{ columnGap: 6, alignItems: 'center', paddingLeft: 4 }}>
                    <WebImg src={IconError} size={20} />
                    <WebText type='body6' color='rgba(235,84,94,0.9)'>
                      {row.error}
                    </WebText>
                  </Row>
                )}
              </View>
            );
          })}
        </SessionRows>
      )}

      {error && (
        <ImportErrorList>
          <ImportErrorRow>
            <WebImg src={IconError} size={20} />
            <WebText type='body5' color='#EB545E'>
              {error}
            </WebText>
          </ImportErrorRow>
        </ImportErrorList>
      )}

      {rows.length > 0 && (
        <>
          <Row style={{ columnGap: 8, alignItems: 'flex-start' }}>
            <WebCheckBox
              checked={acknowledged}
              onClick={(): void => setAcknowledged(!acknowledged)}
            />
            <WebText type='body5' color='#878D99'>
              Your session key will only be stored on this device. Adena can&apos;t recover it for
              you.
            </WebText>
          </Row>
          <WebWarningDescriptionBox description='If the private key to your session account is exposed or lost, be sure to revoke the session from your Master Account.' />
        </>
      )}

      <WebButton
        figure='primary'
        size='full'
        text={
          masterAddressValid
            ? loading
              ? 'Importing…'
              : 'Import Session Account'
            : 'Load Session Account'
        }
        disabled={!canSubmit}
        onClick={onClickImport}
      />
    </View>
  );
};

export default SessionAddScreen;
