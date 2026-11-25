import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { DappMessageView } from '../components/pages';
import { toErrorMessage } from '../core/error-message';
import { AppErrorCode, isAppError } from '../core/errors';
import { useContainer } from '../di/container-provider';
import { DappMethod, DappRequest } from '../domain/dapp';
import { queryKeys } from '../queries/query-keys';
import { DAPP_FEE_WARNING_MULTIPLIER, DappRequestContext } from '../services/dapp.service';
import { formatTokenAmount, parseCoin } from '../utils/amount';

const TITLES: Record<DappRequest['method'], { title: string; approve: string }> = {
  [DappMethod.CONNECT]: { title: 'Connect app', approve: 'Connect' },
  [DappMethod.SIGN_TRANSACTION]: { title: 'Sign transaction', approve: 'Sign' },
  [DappMethod.SIGN_AND_BROADCAST]: { title: 'Confirm transaction', approve: 'Approve' },
};

export interface DappRequestFlowOptions {
  // The overlay sheet signs on the requested network without changing the wallet's selection.
  allowCrossNetwork: boolean;
  // Runs right before connecting or signing, e.g. biometric unlock; throwing aborts the approval.
  authorize?: () => Promise<void>;
  // Runs after approval settles, e.g. re-locking the overlay's session.
  release?: () => void;
}

// Review/approve/reject logic shared by the in-app request screen and the Android overlay sheet.
export interface DappRequestFlow {
  request: DappRequest | null;
  context: DappRequestContext | undefined;
  needsSwitch: boolean;
  isTransaction: boolean;
  title: string;
  approveLabel: string;
  messages: DappMessageView[];
  feeLabel: string | undefined;
  // Set when the dApp's fee is far above the wallet's estimate; approval stays possible.
  feeWarning: string | undefined;
  // Code files are `${messageIndex}:${fileIndex}`; Approve waits until every one was opened.
  expandedCode: string[];
  toggleCode: (id: string) => void;
  codeReviewPending: boolean;
  loading: boolean;
  error: string | undefined;
  canApprove: boolean;
  approving: boolean;
  approve: () => Promise<string>;
  resetApproval: () => void;
  // Callback URL answering the dApp with a rejection, or with the resolution/approval error.
  rejectionUrl: () => string | null;
}

// requestId is chosen by the dApp, so the cached draft is keyed by the whole request (minus receive time).
const requestDigest = (request: DappRequest | null): string =>
  request ? bytesToHex(sha256(utf8ToBytes(JSON.stringify({ ...request, receivedAt: undefined })))) : '';

export const useDappRequestFlow = (request: DappRequest | null, options: DappRequestFlowOptions): DappRequestFlow => {
  const { dappService } = useContainer();
  const queryClient = useQueryClient();
  const digest = useMemo(() => requestDigest(request), [request]);

  const resolve = (): { context?: DappRequestContext; error?: string; cause?: unknown } => {
    if (!request) {
      return {};
    }

    try {
      return { context: dappService.resolveContext(request) };
    }
    catch (error) {
      return { error: toErrorMessage(error), cause: error };
    }
  };
  const { context, error: resolveError, cause: resolveCause } = resolve();
  const needsSwitch = Boolean(context?.requiresNetworkSwitch) && !options.allowCrossNetwork;
  const isTransaction = request !== null && request.method !== DappMethod.CONNECT;

  const preparedKey = [...queryKeys.all, 'dapp-request', request?.callbackOrigin, request?.method, request?.requestId, digest, context?.network.id, context?.account.id];
  const preparedKeyHash = JSON.stringify(preparedKey);

  // A finished (approved, rejected or unmounted) request drops its draft.
  useEffect(() => (): void => queryClient.removeQueries({ queryKey: JSON.parse(preparedKeyHash), exact: true }), [preparedKeyHash, queryClient]);

  // The last error from the wallet's own approval step (after authorization); the dApp hears it instead of a rejection.
  const [attempt, setAttempt] = useState<{ key: string; error: unknown } | null>(null);
  const attemptError = attempt && attempt.key === digest ? attempt.error : undefined;
  const attempted = async (run: () => Promise<string> | string): Promise<string> => {
    try {
      return await run();
    }
    catch (error) {
      setAttempt({ key: digest, error });
      throw error;
    }
  };
  // Approving again would only answer DUPLICATE_REQUEST and hide the pending hash.
  const approvalLocked = isAppError(attemptError, AppErrorCode.TRANSACTION_PENDING) || isAppError(attemptError, AppErrorCode.DUPLICATE_REQUEST);

  const prepared = useQuery({
    queryKey: preparedKey,
    queryFn: () => {
      if (!request || request.method === DappMethod.CONNECT || !context) {
        throw new Error('Nothing to prepare');
      }

      return dappService.prepareTransaction(request, context);
    },
    enabled: isTransaction && Boolean(context) && !needsSwitch,
    retry: false,
    staleTime: Infinity,
  });

  const approve = useMutation({
    mutationFn: async () => {
      if (!request || !context) {
        throw new Error('Request is not ready');
      }

      // A failure after authorize opened the session (e.g. while restoring accounts) must still release it.
      const authorized = async (run: () => Promise<string> | string): Promise<string> => {
        try {
          await options.authorize?.();
          return await run();
        }
        finally {
          options.release?.();
        }
      };

      if (request.method === DappMethod.CONNECT) {
        return authorized(() => attempted(() => dappService.approveConnect(request, context)));
      }

      const draft = prepared.data?.draft;

      if (!draft) {
        throw new Error('Transaction is not ready');
      }

      return authorized(() => attempted(() => dappService.approveTransaction(request, context, draft)));
    },
  });

  const feeToken = context?.network.feeToken;
  const fee = prepared.data ? parseCoin(prepared.data.draft.fee.gasFee) : null;
  const messages: DappMessageView[] = prepared.data?.summaries ?? [];
  const estimated = prepared.data?.estimatedFee ? parseCoin(prepared.data.estimatedFee.gasFee) : null;
  const codeIds = messages.flatMap((message, position) => (message.code ?? []).map((_, file) => `${position}:${file}`));
  const reviewKey = request?.requestId ?? '';
  const [review, setReview] = useState<{ key: string; expanded: string[]; viewed: string[] }>({ key: reviewKey, expanded: [], viewed: [] });
  const current = review.key === reviewKey ? review : { key: reviewKey, expanded: [], viewed: [] };
  const codeReviewPending = codeIds.some(id => !current.viewed.includes(id));
  const formatFee = (amount: string): string | undefined =>
    feeToken ? `${formatTokenAmount(amount, feeToken.decimals)} ${feeToken.symbol}` : undefined;

  return {
    request,
    context,
    needsSwitch,
    isTransaction,
    title: request ? TITLES[request.method].title : '',
    approveLabel: request ? TITLES[request.method].approve : '',
    messages,
    feeLabel: fee ? formatFee(fee.amount) : undefined,
    feeWarning: estimated
      ? `The app set a fee more than ${DAPP_FEE_WARNING_MULTIPLIER}x the estimated ${formatFee(estimated.amount) ?? estimated.amount}. Approve only if you expect it.`
      : undefined,
    expandedCode: current.expanded,
    toggleCode: (id: string): void => setReview(() => ({
      key: reviewKey,
      expanded: current.expanded.includes(id) ? current.expanded.filter(item => item !== id) : [...current.expanded, id],
      viewed: current.viewed.includes(id) ? current.viewed : [...current.viewed, id],
    })),
    codeReviewPending,
    loading: isTransaction && prepared.isFetching,
    error: resolveError
      ?? (prepared.error ? toErrorMessage(prepared.error) : undefined)
      ?? (approve.error ? toErrorMessage(approve.error) : undefined),
    canApprove: Boolean(context) && !needsSwitch && (!isTransaction || Boolean(prepared.data)) && !codeReviewPending && !approve.isPending && !approvalLocked,
    approving: approve.isPending,
    approve: (): Promise<string> => approve.mutateAsync(),
    resetApproval: (): void => approve.reset(),
    // Callback URL answering the dApp with a rejection, or with the resolution/approval error.
    rejectionUrl: (): string | null => {
      if (!request) {
        return null;
      }

      // The original error keeps its code (e.g. NOT_CONNECTED, TRANSACTION_PENDING) in the dApp response.
      if (resolveError) {
        return dappService.fail(request, resolveCause ?? new Error(resolveError));
      }

      return attemptError !== undefined ? dappService.fail(request, attemptError) : dappService.reject(request);
    },
  };
};
