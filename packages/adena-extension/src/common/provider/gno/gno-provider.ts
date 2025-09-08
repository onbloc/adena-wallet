import {
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
  newRequest,
  parseABCI,
  RPCResponse,
  stringToBase64,
  TransactionEndpoint,
  Tx,
  uint8ArrayToBase64,
} from '@gnolang/tm2-js-client';
import { ResponseDeliverTx } from '@gnolang/tm2-js-client/bin/proto/tm2/abci';
import axios from 'axios';
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
    const defaultAccount: AccountInfo = {
      address: '',
      coins: '',
      chainId: '',
      status: 'IN_ACTIVE',
      publicKey: null,
      accountNumber: '0',
      sequence: '0',
    };

    try {
      const account = await this.getAccount(address, height)
      const {
        address: accAddr,
        coins,
        sequence,
        account_number: accountNumber,
        public_key: publicKey,
      } = account.BaseAccount;
      return {
        address: accAddr,
        coins,
        chainId: this.chainId ?? '',
        status: 'ACTIVE',
        publicKey: publicKey,
        accountNumber,
        sequence,
      };
    } catch (e) {
      console.info(e);
    }

    return {...defaultAccount, address};
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
