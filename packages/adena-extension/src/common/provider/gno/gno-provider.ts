import { GnoJSONRPCProvider } from '@gnolang/gno-js-client';
import {
  ABCIEndpoint,
  ABCIResponse,
  base64ToUint8Array,
  BlockInfo,
  BroadcastTxCommitResult,
  BroadcastTxSyncResult,
  newRequest,
  parseABCI,
  RPCResponse,
  TransactionEndpoint,
} from '@gnolang/tm2-js-client';
import fetchAdapter from '@vespaiach/axios-fetch-adapter';
import { sha256 } from 'adena-module';
import axios from 'axios';

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

    const abciResponse = await axios.post<RPCResponse<ABCIResponse>>(this.baseURL, params.request, {
      adapter: fetchAdapter,
    });

    const abciData = abciResponse.data.result?.response.ResponseBase.Data;
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
        const regex = /\("((?:\\.|[^"\\])*)"\s+\w+\)/g;
        const matches = result.matchAll(regex);

        for (const match of matches) {
          if (match[1]) {
            return match[1];
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

  public waitResultForTransaction(hash: string, timeout?: number): Promise<unknown> {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      // Fetch the starting point
      let currentHeight = await this.getBlockNumber();

      const exitTimeout = timeout ? timeout : 15000;

      const fetchInterval = setInterval(async () => {
        // Fetch the latest block height
        const latestHeight = await this.getBlockNumber();

        if (latestHeight < currentHeight) {
          // No need to parse older blocks
          return;
        }

        for (let blockNum = currentHeight; blockNum <= latestHeight; blockNum++) {
          // Fetch the block from the chain
          const block: BlockInfo = await this.getBlock(blockNum);

          // Check if there are any transactions at all in the block
          if (!block.block.data.txs || block.block.data.txs.length == 0) {
            continue;
          }

          // Find the transaction among the block transactions
          for (const tx of block.block.data.txs) {
            // Decode the base-64 transaction
            const txRaw = base64ToUint8Array(tx);

            // Calculate the transaction hash
            const txHash = sha256(txRaw);
            const txHashStr = Buffer.from(txHash).toString('base64');
            if (txHashStr == hash) {
              // Clear the interval
              clearInterval(fetchInterval);

              // Decode the transaction from amino
              const result = await this.getBlockResult(blockNum);
              resolve(result);
            }
          }
        }

        currentHeight = latestHeight + 1;
      }, 1000);

      setTimeout(() => {
        // Clear the fetch interval
        clearInterval(fetchInterval);

        reject('transaction fetch timeout');
      }, exitTimeout);
    });
  }
}
