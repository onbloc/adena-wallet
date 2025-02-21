import { GnoJSONRPCProvider } from '@gnolang/gno-js-client';
import {
  ABCIEndpoint,
  ABCIResponse,
  BroadcastTxCommitResult,
  BroadcastTxSyncResult,
  newRequest,
  parseABCI,
  RPCResponse,
  TransactionEndpoint,
  Tx,
  uint8ArrayToBase64,
} from '@gnolang/tm2-js-client';
import axios from 'axios';
import { ResponseDeliverTx } from './proto/tm2/abci';
import { parseProto } from './utils';

interface ABCIAccount {
  BaseAccount: {
    address: string;
    coins: string;
    public_key: {
      '@type': string;
      value: string;
    } | null;
    account_number: string;
    sequence: string;
  };
}

export interface AccountInfo {
  address: string;
  coins: string;
  chainId: string;
  status: 'ACTIVE' | 'IN_ACTIVE';
  publicKey: {
    '@type': string;
    value: string;
  } | null;
  accountNumber: string;
  sequence: string;
}

export class GnoProvider extends GnoJSONRPCProvider {
  private chainId?: string;

  constructor(baseURL: string, chainId?: string) {
    super(baseURL);
    this.chainId = chainId;
  }

  public async getAccount(
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
    const params = {
      request: newRequest(ABCIEndpoint.ABCI_QUERY, [
        `auth/accounts/${address}`,
        '',
        `${height ?? 0}`,
        false,
      ]),
    };

    const abciResponse = await fetch(this.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params.request),
    })
      .then((res) => res.json())
      .then((data) => data as RPCResponse<ABCIResponse>)
      .catch(() => null);

    const abciData = abciResponse?.result?.response.ResponseBase.Data;
    // Make sure the response is initialized
    if (!abciData) {
      return defaultAccount;
    }

    try {
      // Parse the account
      const account: ABCIAccount = parseABCI<ABCIAccount>(abciData);
      const {
        address,
        coins,
        sequence,
        account_number: accountNumber,
        public_key: publicKey,
      } = account.BaseAccount;
      return {
        address,
        coins,
        chainId: this.chainId ?? '',
        status: 'ACTIVE',
        publicKey: publicKey,
        accountNumber,
        sequence,
      };
    } catch (e) {
      console.error(e);
    }
    return {
      ...defaultAccount,
      address,
    };
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

  async estimateGas(tx: Tx): Promise<number> {
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
    if (simulateResult.responseBase?.error) {
      throw new Error(simulateResult.responseBase.error.typeUrl);
    }

    return simulateResult.gasUsed.toInt();
  }
}
