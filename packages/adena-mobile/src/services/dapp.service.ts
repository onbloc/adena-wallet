import { AppError, AppErrorCode, isAppError } from '../core/errors';
import { buildCallbackUrl, parseDappRequestUrl } from '../deeplink/dapp-protocol';
import { Account } from '../domain/account';
import { DappMethod, DappRequest, DappResponse, DappResponseStatus, DappTransactionRequest } from '../domain/dapp';
import { Network } from '../domain/network';
import { MessageSummary, TransactionDraft } from '../domain/transaction';
import { parseCoin } from '../utils/amount';
import { AccountService } from './account.service';
import { ConnectedAppService } from './connected-app.service';
import { NetworkService } from './network.service';
import { TransactionService } from './transaction.service';

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
}

// Handles external dApp requests received through deep links.
export class DappService {
  constructor(
    private readonly networkService: NetworkService,
    private readonly accountService: AccountService,
    private readonly transactionService: TransactionService,
    private readonly connectedAppService: ConnectedAppService,
  ) {}

  parseRequestUrl(url: string): DappRequest {
    return parseDappRequestUrl(url);
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

    // Like the extension's checkEstablished: transactions need a prior connect from this origin.
    if (request.method !== DappMethod.CONNECT && !this.connectedAppService.isConnected(request.callbackOrigin, account.id)) {
      throw new AppError(AppErrorCode.NOT_CONNECTED, `${request.callbackOrigin} is not connected to ${account.name}. Connect the app first.`);
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
    const requestedFee = request.gasWanted && request.gasFee && parseCoin(request.gasFee)
      ? { gasWanted: request.gasWanted, gasFee: request.gasFee }
      : null;
    const priced = requestedFee
      ? { ...draft, fee: requestedFee }
      : await this.transactionService.withEstimatedFee(draft, account, network);

    return { draft: priced, summaries: this.transactionService.describe(priced, network) };
  }

  approveConnect(request: DappRequest, context: DappRequestContext): string {
    this.connectedAppService.touch(request.callbackOrigin, request.dapp, context.account.id, context.network.id);
    return this.respond(request, {
      status: DappResponseStatus.SUCCESS,
      data: {
        address: context.address,
        publicKey: context.account.publicKey,
        chainId: context.network.chainId,
      },
    });
  }

  async approveTransaction(
    request: DappTransactionRequest,
    context: DappRequestContext,
    draft: TransactionDraft,
  ): Promise<string> {
    const { account, network } = context;

    this.connectedAppService.touch(request.callbackOrigin, request.dapp, account.id, network.id);

    if (request.method === DappMethod.SIGN_TRANSACTION) {
      const signed = await this.transactionService.sign(draft, account, network);

      return this.respond(request, { status: DappResponseStatus.SUCCESS, data: { signedTx: signed.encoded, address: context.address } });
    }

    const result = await this.transactionService.signAndBroadcast(draft, account, network);

    return this.respond(request, { status: DappResponseStatus.SUCCESS, data: { ...result } });
  }

  reject(request: DappRequest): string {
    return this.respond(request, { status: DappResponseStatus.FAILURE, error: { code: AppErrorCode.USER_REJECTED, message: 'User rejected the request' } });
  }

  fail(request: DappRequest, error: unknown): string {
    const code = isAppError(error) ? error.code : 'TRANSACTION_FAILED';
    const message = error instanceof Error ? error.message : 'Request failed';

    return this.respond(request, { status: DappResponseStatus.FAILURE, error: { code, message } });
  }

  private respond(request: DappRequest, response: Omit<DappResponse, 'requestId'>): string {
    return buildCallbackUrl(request.callbackUrl, { requestId: request.requestId, ...response });
  }
}
