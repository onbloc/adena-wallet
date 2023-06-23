import { GnoJSONRPCProvider } from '@gnolang/gno-js-client';
import { BlockInfo, base64ToUint8Array } from '@gnolang/tm2-js-client';
import { sha256 } from 'adena-module';

export class GnoProvider extends GnoJSONRPCProvider {
  constructor(baseURL: string) {
    super(baseURL);
  }

  public waitResultForTransaction(hash: string, timeout?: number) {
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
