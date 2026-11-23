import { useMutation, useQuery } from '@tanstack/react-query';

import { DappMessageView } from '../components/pages';
import { toErrorMessage } from '../core/error-message';
import { useContainer } from '../di/container-provider';
import { DappMethod, DappRequest } from '../domain/dapp';
import { queryKeys } from '../queries/query-keys';
import { DappRequestContext } from '../services/dapp.service';
import { formatTokenAmount, parseCoin } from '../utils/amount';

const TITLES: Record<DappRequest['method'], { title: string; approve: string }> = {
  [DappMethod.CONNECT]: { title: 'Connect app', approve: 'Connect' },
  [DappMethod.SIGN_TRANSACTION]: { title: 'Sign transaction', approve: 'Sign' },
  [DappMethod.SIGN_AND_BROADCAST]: { title: 'Confirm transaction', approve: 'Approve' },
};

export interface DappRequestFlowOptions {
  // The overlay sheet signs on the requested network without changing the wallet's selection.
  allowCrossNetwork: boolean;
  // Runs right before signing, e.g. biometric unlock; throwing aborts the approval.
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
  loading: boolean;
  error: string | undefined;
  canApprove: boolean;
  approving: boolean;
  approve: () => Promise<string>;
  resetApproval: () => void;
  // Callback URL answering the dApp with a rejection (or the resolution error).
  rejectionUrl: () => string | null;
}

export const useDappRequestFlow = (request: DappRequest | null, options: DappRequestFlowOptions): DappRequestFlow => {
  const { dappService } = useContainer();

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

  const prepared = useQuery({
    queryKey: [...queryKeys.all, 'dapp-request', request?.requestId, context?.network.id, context?.account.id],
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

      if (request.method === DappMethod.CONNECT) {
        return dappService.approveConnect(request, context);
      }

      if (!prepared.data) {
        throw new Error('Transaction is not ready');
      }

      await options.authorize?.();

      try {
        return await dappService.approveTransaction(request, context, prepared.data.draft);
      }
      finally {
        options.release?.();
      }
    },
  });

  const feeToken = context?.network.feeToken;
  const fee = prepared.data ? parseCoin(prepared.data.draft.fee.gasFee) : null;
  const messages: DappMessageView[] = prepared.data?.summaries ?? [];

  return {
    request,
    context,
    needsSwitch,
    isTransaction,
    title: request ? TITLES[request.method].title : '',
    approveLabel: request ? TITLES[request.method].approve : '',
    messages,
    feeLabel: fee && feeToken ? `${formatTokenAmount(fee.amount, feeToken.decimals)} ${feeToken.symbol}` : undefined,
    loading: isTransaction && prepared.isFetching,
    error: resolveError
      ?? (prepared.error ? toErrorMessage(prepared.error) : undefined)
      ?? (approve.error ? toErrorMessage(approve.error) : undefined),
    canApprove: Boolean(context) && !needsSwitch && (!isTransaction || Boolean(prepared.data)) && !approve.isPending,
    approving: approve.isPending,
    approve: (): Promise<string> => approve.mutateAsync(),
    resetApproval: (): void => approve.reset(),
    // Callback URL answering the dApp with a rejection (or the resolution error).
    rejectionUrl: (): string | null => {
      if (!request) {
        return null;
      }

      // The original error keeps its code (e.g. NOT_CONNECTED) in the dApp response.
      return resolveError ? dappService.fail(request, resolveCause ?? new Error(resolveError)) : dappService.reject(request);
    },
  };
};
