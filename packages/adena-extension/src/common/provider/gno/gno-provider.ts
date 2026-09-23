import {
  INSUFFICIENT_COINS_ERROR_TYPE,
  INSUFFICIENT_FUNDS_ERROR_TYPE,
  INVALID_PUBLIC_KEY_ERROR_TYPE,
  UNKNOWN_ADDRESS_ERROR_TYPE,
} from '@common/constants/tx-error.constant';
import { parseTokenAmount } from '@common/utils/amount-utils';
import { toHexHash } from '@common/utils/hash-utils';
import type { SessionAccountInfo } from '@gnolang/gno-js-client';
import { GnoJSONRPCProvider } from '@gnolang/gno-js-client';
import {
  ABCIEndpoint,
  ABCIErrorKey,
  ABCIResponse,
  Any,
  BroadcastTransactionMap,
  BroadcastTxCommitResult,
  BroadcastTxSyncResult,
  CommonEndpoint,
  newRequest,
  parseABCI,
  ResponseDeliverTx,
  RestService,
  RPCResponse,
  Status,
  stringToBase64,
  TM2Error,
  TransactionEndpoint,
  Tx,
  uint8ArrayToBase64,
} from '@gnolang/tm2-js-client';
import { HttpClient, RpcClient, Tm2Client } from '@gnolang/tm2-rpc';
import axios from 'axios';
import { decodeQEvalTupleValue, formatGnoArg, GnoArg, parseFirstQEvalTuple } from './qeval';
import { RpcEndpointSelector } from './rpc-endpoint-selector';
import {
  ABCIAccount,
  AccountInfo,
  GnoDocumentInfo,
  GnoSessionAccountResponse,
  VMQueryType,
} from './types';
import {
  fetchABCIResponse,
  isHttpsAvailable,
  makeRequestQueryPath,
  parseProto,
  postABCIResponse,
} from './utils';

const BASE64_JSON_NULL = stringToBase64('null');

function isBase64JSONNull(data: string): boolean {
  return data === BASE64_JSON_NULL;
}

type Tm2ClientConstructor = new (client: RpcClient) => Tm2Client;
type GnoSessionAccountInfoResponse = GnoSessionAccountResponse & SessionAccountInfo;
type RpcRequest = Parameters<HttpClient['execute']>[0];
type RpcSuccessResponse = Awaited<ReturnType<HttpClient['execute']>>;

// Routes the base GnoJSONRPCProvider's JSON-RPC calls through the endpoint
// selector, so they fail over alongside the requests issued here directly.
class FallbackRpcClient implements RpcClient {
  private readonly clients = new Map<string, HttpClient>();

  private readonly endpoints: RpcEndpointSelector;

  constructor(endpoints: RpcEndpointSelector) {
    this.endpoints = endpoints;
  }

  public execute = (request: RpcRequest): Promise<RpcSuccessResponse> => {
    return this.endpoints.run((endpoint) => this.clientFor(endpoint).execute(request));
  };

  public disconnect = (): void => {
    this.clients.forEach((client) => client.disconnect());
  };

  private clientFor(endpoint: string): HttpClient {
    const client = this.clients.get(endpoint) ?? new HttpClient(endpoint);
    this.clients.set(endpoint, client);
    return client;
  }
}

function createTm2Client(endpoints: RpcEndpointSelector): Tm2Client {
  return new ((Tm2Client as unknown) as Tm2ClientConstructor)(new FallbackRpcClient(endpoints));
}

function toNumberOrUndefined(value: string | undefined): number | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }
  return Number(value);
}

function withSessionAccountInfo(res: GnoSessionAccountResponse): GnoSessionAccountInfoResponse {
  const session = res.BaseSessionAccount;
  const base = session.BaseAccount;

  return Object.assign(res, {
    address: base.address,
    public_key: base.public_key ?? undefined,
    account_number: base.account_number,
    sequence: base.sequence,
    master_address: session.master_address,
    expires_at: toNumberOrUndefined(session.expires_at),
    spend_limit: session.spend_limit,
    spend_period: toNumberOrUndefined(session.spend_period),
    spend_used: session.spend_used,
    spend_reset: toNumberOrUndefined(session.spend_reset),
    allow_paths: res.allow_paths,
  });
}

export class GnoProvider extends GnoJSONRPCProvider {
  private chainId?: string;
  private readonly endpoints: RpcEndpointSelector;

  constructor(baseURL: string, chainId?: string, fallbackRPCUrl?: string) {
    const endpoints = new RpcEndpointSelector(baseURL, fallbackRPCUrl);
    super(createTm2Client(endpoints));
    this.endpoints = endpoints;
    this.chainId = chainId;
  }

  public async getStatus(): Promise<Status> {
    return this.endpoints.run((baseURL) =>
      RestService.post<Status>(baseURL, {
        request: newRequest(CommonEndpoint.STATUS, ['0']),
      }),
    );
  }

  public async getAccountNumber(address: string, height?: number | undefined): Promise<number> {
    return this.getAccountInfo(address, height)
      .then((account) => Number(account?.accountNumber ?? 0))
      .catch(() => 0);
  }

  public async getAccountSequence(address: string, height?: number | undefined): Promise<number> {
    return this.getAccountInfo(address, height)
      .then((account) => Number(account?.sequence ?? 0))
      .catch(() => 0);
  }

  public async getGasPrice(height?: number | undefined): Promise<number> {
    const requestBody = newRequest(ABCIEndpoint.ABCI_QUERY, [
      'auth/gasprice',
      '',
      `${height ?? 0}`,
      false,
    ]);

    const abciResponse = await this.endpoints
      .run((baseURL) => postABCIResponse(baseURL, requestBody))
      .catch(() => null);

    const abciData = abciResponse?.result?.response.ResponseBase.Data;
    // Make sure the response is initialized
    if (!abciData) {
      return 0;
    }

    const gasPrice = parseABCI<{
      gas: number;
      price: string;
    }>(abciData);

    const priceAmount = parseTokenAmount(gasPrice.price);
    if (gasPrice.gas === 0 || priceAmount === 0) {
      return 0;
    }

    return priceAmount / gasPrice.gas;
  }

  public async getAccountInfo(
    address: string,
    height?: number | undefined,
  ): Promise<AccountInfo | null> {
    const inActiveAccount: AccountInfo = {
      address,
      coins: '',
      chainId: '',
      status: 'IN_ACTIVE',
      publicKey: null,
      accountNumber: '0',
      sequence: '0',
    };

    const abciAccount = await this.getAccount(address, height).catch((e) => {
      console.info(e);
      return null;
    });

    if (!abciAccount || !abciAccount.BaseAccount) {
      return inActiveAccount;
    }

    try {
      const {
        coins,
        public_key: publicKey,
        account_number: accountNumber,
        sequence,
        // The tm2-js-client ABCIAccount type predates the vesting field, so the
        // local ABCIAccount declaration is the one that describes the wire shape.
        vesting,
      } = abciAccount.BaseAccount as ABCIAccount['BaseAccount'];

      return {
        address,
        coins,
        chainId: this.chainId ?? '',
        status: 'ACTIVE',
        publicKey,
        accountNumber,
        sequence,
        vesting,
      };
    } catch (e) {
      console.info(e);
      return inActiveAccount;
    }
  }

  // Lists all sessions for a master account.
  //
  // ABCI path: auth/accounts/{masterAddr}/sessions
  // Response: amino JSON array of GnoSessionAccountResponse (wrapper with
  // BaseSessionAccount.BaseAccount nested + allow_paths).
  //
  // Error policy:
  //   - empty session list (ABCI Data is empty bytes or JSON null) -> []
  //   - parse failure on non-empty Data → throw (do not mask schema drift)
  //   - network/RPC error → throw (do not mask endpoint changes)
  public async getSessions(
    masterAddr: string,
    height?: number | undefined,
  ): Promise<GnoSessionAccountInfoResponse[]> {
    const requestBody = newRequest(ABCIEndpoint.ABCI_QUERY, [
      `auth/accounts/${masterAddr}/sessions`,
      '',
      `${height ?? 0}`,
      false,
    ]);

    const abciResponse = await this.endpoints.run((baseURL) =>
      postABCIResponse(baseURL, requestBody),
    );
    const abciData = abciResponse?.result?.response.ResponseBase.Data;
    if (!abciData || isBase64JSONNull(abciData)) {
      return [];
    }

    const parsed = parseABCI<GnoSessionAccountResponse[] | null>(abciData);
    return (parsed ?? []).map(withSessionAccountInfo);
  }

  // Returns a single session for (master, session) or null if not found.
  //
  // ABCI path: auth/accounts/{masterAddr}/session/{sessionAddr}
  //
  // Error policy: same as getSessions. "Not found" is signaled by an empty
  // ABCI Data and returns null; parse and network errors throw.
  public async getSession(
    masterAddr: string,
    sessionAddr: string,
    height?: number | undefined,
  ): Promise<GnoSessionAccountInfoResponse> {
    const requestBody = newRequest(ABCIEndpoint.ABCI_QUERY, [
      `auth/accounts/${masterAddr}/session/${sessionAddr}`,
      '',
      `${height ?? 0}`,
      false,
    ]);

    const abciResponse = await this.endpoints.run((baseURL) =>
      postABCIResponse(baseURL, requestBody),
    );
    const abciData = abciResponse?.result?.response.ResponseBase.Data;
    if (!abciData) {
      // "Not found". The base GnoJSONRPCProvider.getSession signature (gno-js-
      // client v2) is non-nullable, so we can't widen the return type to
      // `| null` without breaking the override. All call sites already treat
      // the result as nullable; keep the cast as the intentional bridge.
      return (null as unknown) as GnoSessionAccountInfoResponse;
    }

    return withSessionAccountInfo(parseABCI<GnoSessionAccountResponse>(abciData));
  }

  /**
   * Evaluate `functionName(args...)` and return its first return value, decoded.
   *
   * A Gno function may declare one result (`TokenURI(tid) string`) or two
   * (`TokenURI(tid) (string, error)`), so the trailing tuples are handed back
   * untouched in `rest` — `(undefined)` for a nil error, a struct literal
   * otherwise — and it is the caller's job to decide what a non-nil error
   * means for the value it asked for.
   */
  public evaluateFunction(
    packagePath: string,
    functionName: string,
    params: GnoArg[] = [],
  ): Promise<{ value: string; rest: string } | null> {
    const expression = `${functionName}(${params.map(formatGnoArg).join(', ')})`;

    return this.evaluateExpression(packagePath, expression)
      .then((result) => {
        const parsed = parseFirstQEvalTuple(result);
        if (!parsed) {
          return null;
        }

        return { value: decodeQEvalTupleValue(parsed.tuple), rest: parsed.rest };
      })
      .catch(() => null);
  }

  public getValueByEvaluateExpression(
    packagePath: string,
    functionName: string,
    params: (string | number)[],
  ): Promise<string | null> {
    return this.evaluateFunction(packagePath, functionName, params).then(
      (parsed) => parsed?.value ?? null,
    );
  }

  /**
   * Build a Gno IIFE expression that runs multi-statement logic inside a single
   * `vm/qeval` call and returns a typed value. Mirrors the pattern:
   *
   *   (func() <returnType> { <statements>; <call>; return <returnExpression> })()
   *
   * `statements` are emitted first, so any variable defined there is in scope
   * for the `call` shorthand and the `returnExpression`. Each entry must be a
   * complete Gno statement without a trailing semicolon.
   *
   * `call` is a shorthand for the most common shape: invoke a package function,
   * capture `(value, err)`, panic on error, and return an expression derived
   * from `value`. Arguments are escaped with `gnoLiteral`; pass `gnoRaw(expr)`
   * when an argument should be inlined verbatim (e.g. a variable from
   * `statements`).
   */
  public static buildIIFEExpression(params: {
    returnType: string;
    returnExpression: string;
    statements?: string[];
    call?: {
      name: string;
      args?: GnoArg[];
      resultVar?: string;
      errorVar?: string;
    };
  }): string {
    const { returnType, returnExpression, statements = [], call } = params;

    const callStmts: string[] = [];
    if (call) {
      const resultVar = call.resultVar ?? 'result';
      const errorVar = call.errorVar ?? 'err';
      const args = (call.args ?? []).map(formatGnoArg).join(', ');
      callStmts.push(`${resultVar}, ${errorVar} := ${call.name}(${args})`);
      callStmts.push(`if ${errorVar} != nil { panic(${errorVar}) }`);
    }

    const body = [...statements, ...callStmts, `return ${returnExpression}`].join('; ');
    return `(func() ${returnType} { ${body} })()`;
  }

  /**
   * Execute a Gno IIFE expression via `vm/qeval` and return the raw response
   * string produced by the node (e.g. `("foo" string)` or `(42 int64)`).
   * Decoding the payload into a typed value is left to the caller. Combine
   * with `parseQEvalResult` / `decodeQEvalString` / `decodeQEvalInt` etc.
   */
  public evaluateIIFE(
    packagePath: string,
    params: Parameters<typeof GnoProvider.buildIIFEExpression>[0],
    height?: number,
  ): Promise<string> {
    const expression = GnoProvider.buildIIFEExpression(params);
    return this.evaluateExpression(packagePath, expression, height);
  }

  // Workaround for tm2-rpc@1.0.0: its decodeBroadcastTxSync expects a wrapper
  // shape { ResponseBase, GasWanted, GasUsed, hash }, but a Gno node returns
  // the CheckTx fields flat ({ error, data, log, hash }) under result. The
  // library decoder throws "Cannot read properties of undefined (reading
  // 'Error')". We bypass it by routing BROADCAST_TX_SYNC through a direct
  // JSON-RPC call. BROADCAST_TX_COMMIT delegates to super because the commit
  // response does include ResponseBase inside check_tx/deliver_tx and the
  // library decoder handles it correctly.
  public async sendTransaction<K extends keyof BroadcastTransactionMap>(
    tx: string,
    endpoint: K,
  ): Promise<BroadcastTransactionMap[K]['result']> {
    if (endpoint === TransactionEndpoint.BROADCAST_TX_SYNC) {
      const result = await this.sendTransactionSync(tx);
      return result as BroadcastTransactionMap[K]['result'];
    }

    const result = await super.sendTransaction(tx, endpoint);
    if (!result?.hash) {
      return result;
    }

    // The node returns the tx hash base64-encoded; the wallet uses hex.
    return {
      ...result,
      hash: toHexHash(result.hash),
    };
  }

  public async sendTransactionSync(tx: string): Promise<BroadcastTxSyncResult> {
    type RawSyncResult = {
      error: { [key: string]: string } | null;
      data: string | null;
      log: string;
      hash: string;
    };

    const rpcResponse = await this.endpoints.run((baseURL) =>
      axios.post<RPCResponse<RawSyncResult>>(baseURL, {
        jsonrpc: '2.0',
        id: 1,
        method: TransactionEndpoint.BROADCAST_TX_SYNC,
        params: [tx],
      }),
    );

    if (rpcResponse.data.error) {
      throw new Error(rpcResponse.data.error.message ?? 'broadcast_tx_sync failed');
    }

    const result = rpcResponse.data.result;
    if (!result) {
      throw new Error('broadcast_tx_sync returned no result');
    }

    const log = result.log ?? '';
    if (result.error) {
      // Match the library's broadcastTxSync semantics: on CheckTx failure,
      // throw a TM2Error carrying the chain log so callers can use
      // `instanceof TM2Error` and surface `.log` for diagnostics.
      const errType = result.error[ABCIErrorKey];
      throw new TM2Error(
        errType ? `broadcast_tx_sync failed: ${errType}` : 'broadcast_tx_sync failed',
        log,
      );
    }

    return {
      error: null,
      data: result.data ?? null,
      Log: log,
      hash: toHexHash(result.hash),
    };
  }

  public async sendTransactionCommit(tx: string): Promise<BroadcastTxCommitResult> {
    const response = this.sendTransaction(tx, TransactionEndpoint.BROADCAST_TX_COMMIT);
    return response;
  }

  async simulateTx(tx: Tx): Promise<ResponseDeliverTx> {
    // For SessionAccount simulates the placeholder signature emitted by
    // documentToDefaultTx carries session_addr, so the node routes the
    // simulate as a session signature and skips the master pubkey-address
    // derivation check.
    const encodedTx = uint8ArrayToBase64(Tx.encode(tx).finish());
    const params = {
      request: newRequest(ABCIEndpoint.ABCI_QUERY, ['.app/simulate', `${encodedTx}`, '0', false]),
    };

    const abciResponse = await this.endpoints.run((baseURL) =>
      axios.post<RPCResponse<ABCIResponse>>(baseURL, params.request, {}),
    );

    const responseValue = abciResponse.data.result?.response.Value;
    if (!responseValue) {
      throw new Error('Failed to estimate gas');
    }

    const simulateResult = parseProto(responseValue, ResponseDeliverTx.decode);

    if (simulateResult.response_base?.error) {
      if (
        simulateResult.response_base.error.type_url === INVALID_PUBLIC_KEY_ERROR_TYPE ||
        simulateResult.response_base.error.type_url === UNKNOWN_ADDRESS_ERROR_TYPE
      ) {
        throw new Error(INVALID_PUBLIC_KEY_ERROR_TYPE);
      }

      if (
        simulateResult.response_base.error.type_url === INSUFFICIENT_FUNDS_ERROR_TYPE ||
        simulateResult.response_base.error.type_url === INSUFFICIENT_COINS_ERROR_TYPE
      ) {
        throw new Error(simulateResult.response_base.error.type_url);
      }

      const errorResult = parseProto(simulateResult.response_base.error.value, Any.decode);
      if (errorResult.type_url !== '') {
        throw new Error(errorResult.type_url);
      }

      const typeUrl = simulateResult.response_base.error.type_url;
      const errorLogs = simulateResult.response_base.log.split('\n');

      const errorLogFirstLine = errorLogs.length > 0 ? errorLogs[0] : '';
      if (errorLogFirstLine !== '') {
        throw new Error(`${typeUrl}: ${errorLogFirstLine}`);
      }

      throw new Error(typeUrl);
    }

    return simulateResult;
  }

  public async getRealmDocument(packagePath: string): Promise<GnoDocumentInfo | null> {
    const query = VMQueryType.QUERY_DOCUMENT;
    const base64PackagePath = stringToBase64(packagePath);

    try {
      const abciResponse = await this.endpoints.run(async (baseURL) => {
        const requestQuery = await getRequestQueryPath(baseURL, query, base64PackagePath);
        return fetchABCIResponse(requestQuery, false);
      });
      const abciData = abciResponse?.result?.response.ResponseBase.Data;
      if (!abciData) {
        return null;
      }

      return parseABCI<GnoDocumentInfo>(abciData);
    } catch (e) {
      console.info(e);
    }

    return null;
  }
}

async function getRequestQueryPath(baseURL: string, path: string, data: string): Promise<string> {
  const ssl = await isHttpsAvailable(baseURL);
  return makeRequestQueryPath(baseURL, path, data, ssl);
}
