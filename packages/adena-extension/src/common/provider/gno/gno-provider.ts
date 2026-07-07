import {
  INSUFFICIENT_COINS_ERROR_TYPE,
  INSUFFICIENT_FUNDS_ERROR_TYPE,
  INVALID_PUBLIC_KEY_ERROR_TYPE,
  UNKNOWN_ADDRESS_ERROR_TYPE,
} from '@common/constants/tx-error.constant';
import { parseTokenAmount } from '@common/utils/amount-utils';
import { GnoJSONRPCProvider } from '@gnolang/gno-js-client';
import type { SessionAccountInfo } from '@gnolang/gno-js-client';
import { HttpClient, Tm2Client } from '@gnolang/tm2-rpc';
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
  RestService,
  RPCResponse,
  Status,
  stringToBase64,
  TM2Error,
  TransactionEndpoint,
  Tx,
  uint8ArrayToBase64,
  ResponseDeliverTx,
} from '@gnolang/tm2-js-client';
import { encodeGnoTx, extractSessionAddressFromGnoTxBase64 } from 'adena-module';
import axios from 'axios';
import { formatGnoArg, GnoArg } from './qeval';
import { AccountInfo, GnoDocumentInfo, GnoSessionAccountResponse, VMQueryType } from './types';
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

function base64ToUpperHex(b64: string): string {
  if (!b64) {
    return '';
  }
  const bin = atob(b64);
  let hex = '';
  for (let i = 0; i < bin.length; i++) {
    hex += bin.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return hex.toUpperCase();
}

type Tm2ClientConstructor = new (client: HttpClient) => Tm2Client;
type GnoSessionAccountInfoResponse = GnoSessionAccountResponse & SessionAccountInfo;

function createTm2Client(baseURL: string): Tm2Client {
  return new (Tm2Client as unknown as Tm2ClientConstructor)(new HttpClient(baseURL));
}

function toNumberOrUndefined(value: string | undefined): number | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }
  return Number(value);
}

function withSessionAccountInfo(
  res: GnoSessionAccountResponse,
): GnoSessionAccountInfoResponse {
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
  private readonly baseURL: string;

  constructor(baseURL: string, chainId?: string) {
    super(createTm2Client(baseURL));
    this.baseURL = baseURL;
    this.chainId = chainId;
  }

  public async getStatus(): Promise<Status> {
    return await RestService.post<Status>(this.baseURL, {
      request: newRequest(CommonEndpoint.STATUS, ['0']),
    });
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

    const abciResponse = await postABCIResponse(this.baseURL, requestBody).catch(() => null);

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
      } = abciAccount.BaseAccount;

      return {
        address,
        coins,
        chainId: this.chainId ?? '',
        status: 'ACTIVE',
        publicKey,
        accountNumber,
        sequence,
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

    const abciResponse = await postABCIResponse(this.baseURL, requestBody);
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

    const abciResponse = await postABCIResponse(this.baseURL, requestBody);
    const abciData = abciResponse?.result?.response.ResponseBase.Data;
    if (!abciData) {
      // "Not found". The base GnoJSONRPCProvider.getSession signature (gno-js-
      // client v2) is non-nullable, so we can't widen the return type to
      // `| null` without breaking the override. All call sites already treat
      // the result as nullable; keep the cast as the intentional bridge.
      return null as unknown as GnoSessionAccountInfoResponse;
    }

    return withSessionAccountInfo(parseABCI<GnoSessionAccountResponse>(abciData));
  }

  public async getTransactionSessionAddress(hash: string): Promise<string | null> {
    // The indexer returns tx hashes base64-encoded, but tm2's getTransaction
    // parses its argument as hex (splitting into byte pairs via parseInt(_, 16)).
    // Passing the base64 hash directly yields garbage bytes, the /tx lookup
    // fails, and every signer resolves to null. For session accounts that drops
    // the entire history, so convert to hex before querying.
    let hexHash: string;
    try {
      hexHash = base64ToUpperHex(hash);
    } catch {
      return null;
    }
    if (!hexHash) {
      return null;
    }
    return this.getTransaction(hexHash)
      .then((result) => {
        if (!result?.tx) {
          return null;
        }
        return extractSessionAddressFromGnoTxBase64(result.tx);
      })
      .catch(() => null);
  }

  public getValueByEvaluateExpression(
    packagePath: string,
    functionName: string,
    params: (string | number)[],
  ): Promise<string | null> {
    const paramValues = params.map((param) =>
      typeof param === 'number' ? `${param}` : `"${param}"`,
    );
    const expression = `${functionName}(${paramValues.join(',')})`;

    return this.evaluateExpression(packagePath, expression)
      .then((result) => {
        const regex = /\((?:"((?:\\.|[^"\\])*)"|(\S+))\s+\w+\)/g;
        const matches = result.matchAll(regex);

        for (const match of matches) {
          if (match?.[1] !== undefined) {
            const unescaped = match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
            return unescaped;
          }

          if (match?.[2] !== undefined) {
            return `${match[2]}`;
          }
        }

        return null;
      })
      .catch(() => null);
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
    return super.sendTransaction(tx, endpoint);
  }

  public async sendTransactionSync(tx: string): Promise<BroadcastTxSyncResult> {
    type RawSyncResult = {
      error: { [key: string]: string } | null;
      data: string | null;
      log: string;
      hash: string;
    };

    const rpcResponse = await axios.post<RPCResponse<RawSyncResult>>(this.baseURL, {
      jsonrpc: '2.0',
      id: 1,
      method: TransactionEndpoint.BROADCAST_TX_SYNC,
      params: [tx],
    });

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
      hash: base64ToUpperHex(result.hash),
    };
  }

  public async sendTransactionCommit(tx: string): Promise<BroadcastTxCommitResult> {
    const response = this.sendTransaction(tx, TransactionEndpoint.BROADCAST_TX_COMMIT);
    return response;
  }

  async simulateTx(tx: Tx): Promise<ResponseDeliverTx> {
    // encodeGnoTx falls back to tm2 Tx.encode when no signature carries
    // session_addr, so byte equality with the legacy path is preserved for
    // non-session simulates. For SessionAccount simulates the placeholder
    // LocalTxSignature emitted by documentToDefaultTx (with sessionAddr)
    // reaches the node, which routes the simulate as a session signature
    // and skips the master pubkey-address derivation check.
    const encodedTx = uint8ArrayToBase64(encodeGnoTx(tx));
    const params = {
      request: newRequest(ABCIEndpoint.ABCI_QUERY, ['.app/simulate', `${encodedTx}`, '0', false]),
    };

    const abciResponse = await axios.post<RPCResponse<ABCIResponse>>(
      this.baseURL,
      params.request,
      {},
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
    const requestQuery = await this.getRequestQueryPath(query, base64PackagePath);

    try {
      const abciResponse = await fetchABCIResponse(requestQuery, false);
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

  private async getRequestQueryPath(path: string, data: string): Promise<string> {
    const ssl = await isHttpsAvailable(this.baseURL);
    return makeRequestQueryPath(this.baseURL, path, data, ssl);
  }
}
