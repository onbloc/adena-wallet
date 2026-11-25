import { AppError, AppErrorCode, isAppError, TransactionPendingError } from '../core/errors';
import { buildCallbackUrl, parseDappRequestUrl } from '../deeplink/dapp-protocol';
import { Account } from '../domain/account';
import { DappMethod, DappRequest, DappResponse, DappResponseStatus, DappTransactionRequest } from '../domain/dapp';
import { Network } from '../domain/network';
import { MessageSummary, TransactionDraft, TransactionFee } from '../domain/transaction';
import { MemoryProcessedDappRequestRepository, ProcessedDappRequestRepository } from '../repositories/processed-dapp-request.repository';
import { parseCoin } from '../utils/amount';
import { BigNumber } from '../utils/big-number';
import { AccountService } from './account.service';
import { ConnectedAppService } from './connected-app.service';
import { NetworkService } from './network.service';
import { TransactionService } from './transaction.service';

const GAS_WANTED_PATTERN = /^[1-9]\d{0,17}$/;
// Android package names; anything else from the native side is ignored.
const PACKAGE_NAME_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/i;

// A dApp fee above this multiple of the wallet's estimate is flagged (never blocked).
export const DAPP_FEE_WARNING_MULTIPLIER = 3;

const duplicateRequest = (): AppError => new AppError(AppErrorCode.DUPLICATE_REQUEST, 'This request was already handled. Send a new request.');

const processedKey = (request: DappRequest): string => `${request.callbackOrigin}\n${request.requestId}`;

const exceedsEstimate = (requested: TransactionFee, estimated: TransactionFee): boolean => {
  const fee = parseCoin(requested.gasFee);
  const estimate = parseCoin(estimated.gasFee);

  return Boolean(fee && estimate && fee.denom === estimate.denom && new BigNumber(estimate.amount).gt(0)
    && new BigNumber(fee.amount).gt(new BigNumber(estimate.amount).times(DAPP_FEE_WARNING_MULTIPLIER)));
};

export interface DappRequestContext {
  network: Network;
  account: Account;
  address: string;
  // True when the request targets a network other than the selected one.
  requiresNetworkSwitch: boolean;
}

export interface PreparedDappTransaction {
  draft: TransactionDraft;
  summaries: MessageSummary[];
  // Set when the dApp's fee exceeds DAPP_FEE_WARNING_MULTIPLIER x the estimate.
  estimatedFee?: TransactionFee;
}

// Handles external dApp requests received through deep links.
export class DappService {
  constructor(
    private readonly networkService: NetworkService,
    private readonly accountService: AccountService,
    private readonly transactionService: TransactionService,
    private readonly connectedAppService: ConnectedAppService,
    private readonly processedRequests: ProcessedDappRequestRepository = new MemoryProcessedDappRequestRepository(),
  ) {}

  // callerPackage: Android's launching package (InjectSheetActivity), never a payload field.
  parseRequestUrl(url: string, callerPackage?: string): DappRequest {
    const request = parseDappRequestUrl(url);

    return callerPackage && PACKAGE_NAME_PATTERN.test(callerPackage) ? { ...request, callerPackage } : request;
  }

  // True when this request id from this origin was already answered.
  isProcessed(request: DappRequest): boolean {
    return this.processedRequests.has(processedKey(request));
  }

  rejectDuplicate(request: DappRequest): string {
    return this.fail(request, duplicateRequest());
  }

  resolveContext(request: DappRequest): DappRequestContext {
    const current = this.networkService.getCurrentNetwork();
    const network = request.chainId ? this.networkService.findByChainId(request.chainId) : current;

    if (!network) {
      throw new AppError(AppErrorCode.NETWORK_MISMATCH, `Network ${request.chainId} is not configured in Adena`);
    }

    const account = this.accountService.getCurrentAccount();

    if (!account) {
      throw new AppError(AppErrorCode.WALLET_NOT_FOUND, 'No account available');
    }

    // Like the extension's checkEstablished: transactions need a prior connect from this origin
    // (and, on Android, the same launching package).
    if (request.method !== DappMethod.CONNECT && !this.connectedAppService.isConnected(request.callbackOrigin, account.id, request.callerPackage)) {
      // The message reaches the dApp, so it must not reveal the account name.
      throw new AppError(AppErrorCode.NOT_CONNECTED, `${request.callbackOrigin} is not connected to this account. Connect the app first.`);
    }

    return {
      network,
      account,
      address: this.accountService.getAddress(account, network),
      requiresNetworkSwitch: network.id !== current.id,
    };
  }

  async prepareTransaction(request: DappTransactionRequest, context: DappRequestContext): Promise<PreparedDappTransaction> {
    const { account, network } = context;
    const draft = this.transactionService.createDraft(account, network, request.messages, request.memo);
    // A dApp fee is kept only in the network's fee token, so the review shows what is signed.
    const requestedCoin = request.gasFee ? parseCoin(request.gasFee) : null;
    const requestedFee = request.gasWanted && GAS_WANTED_PATTERN.test(request.gasWanted) && requestedCoin?.denom === network.feeToken.denom
      ? { gasWanted: request.gasWanted, gasFee: `${requestedCoin.amount}${requestedCoin.denom}` }
      : null;
    const summaries = (priced: TransactionDraft): MessageSummary[] => this.transactionService.describe(priced, network);

    if (!requestedFee) {
      const priced = await this.transactionService.withEstimatedFee(draft, account, network);

      return { draft: priced, summaries: summaries(priced) };
    }

    const priced = { ...draft, fee: requestedFee };
    // The estimate only informs a warning; a failed estimate keeps the dApp's fee as before.
    const estimated = await this.transactionService.withEstimatedFee(draft, account, network).catch(() => null);

    return {
      draft: priced,
      summaries: summaries(priced),
      ...(estimated && exceedsEstimate(requestedFee, estimated.fee) ? { estimatedFee: estimated.fee } : {}),
    };
  }

  approveConnect(request: DappRequest, context: DappRequestContext): string {
    this.begin(request);

    try {
      this.connectedAppService.touch(request.callbackOrigin, request.dapp, context.account.id, context.network.id, request.callerPackage);
      return this.respond(request, {
        status: DappResponseStatus.SUCCESS,
        data: {
          address: context.address,
          publicKey: context.account.publicKey,
          chainId: context.network.chainId,
        },
      });
    }
    catch (error) {
      this.processedRequests.remove(processedKey(request));
      throw error;
    }
  }

  async approveTransaction(
    request: DappTransactionRequest,
    context: DappRequestContext,
    draft: TransactionDraft,
  ): Promise<string> {
    const { account, network } = context;

    this.begin(request);

    try {
      this.connectedAppService.markUsed(request.callbackOrigin, account.id, network.id, request.callerPackage);

      if (request.method === DappMethod.SIGN_TRANSACTION) {
        const signed = await this.transactionService.sign(draft, account, network);

        return this.respond(request, { status: DappResponseStatus.SUCCESS, data: { signedTx: signed.encoded, address: context.address } });
      }

      const result = await this.transactionService.signAndBroadcast(draft, account, network);

      return this.respond(request, { status: DappResponseStatus.SUCCESS, data: { ...result } });
    }
    catch (error) {
      // An unknown broadcast outcome keeps the mark, so the request cannot be broadcast again.
      if (!(error instanceof TransactionPendingError)) {
        this.processedRequests.remove(processedKey(request));
      }

      throw error;
    }
  }

  reject(request: DappRequest): string {
    return this.respond(request, { status: DappResponseStatus.FAILURE, error: { code: AppErrorCode.USER_REJECTED, message: 'User rejected the request' } });
  }

  // Only AppError messages (written for dApps) are forwarded; anything else stays generic.
  fail(request: DappRequest, error: unknown): string {
    if (!isAppError(error)) {
      return this.failUnexpected(request);
    }

    // An unknown broadcast outcome carries the hash, so the dApp can track the transaction.
    const data = error instanceof TransactionPendingError ? { data: { hash: error.hash } } : {};

    return this.respond(request, { status: DappResponseStatus.FAILURE, error: { code: error.code, message: error.message }, ...data });
  }

  // Crashes (error boundaries) must not leak internal error text to the dApp.
  failUnexpected(request: DappRequest): string {
    return this.respond(request, { status: DappResponseStatus.FAILURE, error: { code: AppErrorCode.UNEXPECTED_ERROR, message: 'The request could not be completed' } });
  }

  // Marks the request in the shared store before signing, so another sheet or screen cannot approve it too.
  private begin(request: DappRequest): void {
    if (this.isProcessed(request)) {
      throw duplicateRequest();
    }

    this.processedRequests.add(processedKey(request));
  }

  private respond(request: DappRequest, response: Omit<DappResponse, 'requestId'>): string {
    this.processedRequests.add(processedKey(request));
    return buildCallbackUrl(request.callbackUrl, { requestId: request.requestId, ...response });
  }
}
