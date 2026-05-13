import {
  INSUFFICIENT_COINS_ERROR_TYPE,
  INSUFFICIENT_FUNDS_ERROR_TYPE,
  INVALID_PUBLIC_KEY_ERROR_TYPE,
  UNKNOWN_ADDRESS_ERROR_TYPE,
} from '@common/constants/tx-error.constant';
import { parseTokenAmount } from '@common/utils/amount-utils';
import { GnoJSONRPCProvider } from '@gnolang/gno-js-client';
import {
  ABCIEndpoint,
  ABCIResponse,
  Any,
  BroadcastTxCommitResult,
  BroadcastTxSyncResult,
  CommonEndpoint,
  newRequest,
  parseABCI,
  RestService,
  RPCResponse,
  Status,
  stringToBase64,
  TransactionEndpoint,
  Tx,
  uint8ArrayToBase64,
} from '@gnolang/tm2-js-client';
import { ResponseDeliverTx } from '@gnolang/tm2-js-client/bin/proto/tm2/abci';
import axios from 'axios';
import { formatGnoArg, GnoArg } from './qeval';
import { AccountInfo, GnoDocumentInfo, VMQueryType } from './types';
import {
  fetchABCIResponse,
  isHttpsAvailable,
  makeRequestQueryPath,
  parseProto,
  postABCIResponse,
} from './utils';

export class GnoProvider extends GnoJSONRPCProvider {
  private chainId?: string;

  constructor(baseURL: string, chainId?: string) {
    super(baseURL);
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
   * Decoding the payload into a typed value is left to the caller — combine
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

  public async sendTransactionSync(tx: string): Promise<BroadcastTxSyncResult> {
    const response = this.sendTransaction(tx, TransactionEndpoint.BROADCAST_TX_SYNC);
    return response;
  }

  public async sendTransactionCommit(tx: string): Promise<BroadcastTxCommitResult> {
    const response = this.sendTransaction(tx, TransactionEndpoint.BROADCAST_TX_COMMIT);
    return response;
  }

  async simulateTx(tx: Tx): Promise<ResponseDeliverTx> {
    const encodedTx = uint8ArrayToBase64(Tx.encode(tx).finish());
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
