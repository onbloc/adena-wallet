import { toBase64 } from '@cosmjs/encoding';
import { ResponseDeliverTx, Tx } from '@gnolang/tm2-js-client';

import { GnoProvider } from '../../src/repositories/chain/gno/gno-provider';

export interface FakeGnoProviderState {
  chainId: string;
  balances: Record<string, string>;
  accountNumber: string;
  sequence: string;
  gasUsed: bigint;
  // Consensus Block.MaxGas; null makes consensus_params fail.
  maxGas: string | null;
  broadcasts: string[];
  // vm/qeval responder: (pkgPath, expression) => raw node output.
  evaluate: (pkgPath: string, expression: string) => string;
  signatures: Record<string, { FuncName: string; Results: { Type: string }[] }[]>;
  // Every tx received by `.app/simulate`, decoded.
  simulated: Tx[];
  // Optional override of the simulate result (defaults to `{ gas_used: gasUsed }`).
  simulate?: (tx: Tx) => Partial<ResponseDeliverTx>;
}

const encodeData = (value: unknown): string => toBase64(new TextEncoder().encode(JSON.stringify(value)));

// ABCI query response carrying a protobuf ResponseDeliverTx, as `.app/simulate` returns it.
export const simulateAbciResponse = (result: Partial<ResponseDeliverTx>) => ({
  response: { ResponseBase: {}, Value: toBase64(ResponseDeliverTx.encode(ResponseDeliverTx.create(result)).finish()) },
});

// Minimal in-memory stand-in for the Gno JSON-RPC provider.
export const createFakeGnoProvider = (overrides: Partial<FakeGnoProviderState> = {}) => {
  const state: FakeGnoProviderState = {
    chainId: 'test-chain',
    balances: {},
    accountNumber: '7',
    sequence: '3',
    gasUsed: 100_000n,
    maxGas: '3000000000',
    broadcasts: [],
    evaluate: () => '',
    signatures: {},
    simulated: [],
    ...overrides,
  };

  const provider = {
    getStatus: async () => ({ node_info: { network: state.chainId } }),
    getBlockNumber: async () => 10,
    getConsensusParams: async () => {
      if (state.maxGas === null) {
        throw new Error('consensus_params unavailable');
      }

      return { block_height: '10', consensus_params: { Block: { MaxGas: state.maxGas } } };
    },
    getGasPrice: async () => ({ amount: 1, denom: 'ugnot', gas: 1000 }),
    abciQuery: async ({ path, data }: { path: string; data?: Uint8Array }) => {
      if (path === '.app/simulate') {
        // Like a real node: the query data must be the tx bytes themselves.
        const tx = Tx.decode(data ?? new Uint8Array());

        if (tx.messages.length === 0) {
          throw new Error('unable to decode tx');
        }

        state.simulated.push(tx);
        return simulateAbciResponse(state.simulate ? state.simulate(tx) : { gas_used: state.gasUsed });
      }

      const address = path.replace('bank/balances/', '');

      return { response: { ResponseBase: { Data: encodeData(state.balances[address] ?? '') } } };
    },
    getAccount: async () => ({
      BaseAccount: { account_number: state.accountNumber, sequence: state.sequence },
    }),
    evaluateExpression: async (pkgPath: string, expression: string) => state.evaluate(pkgPath, expression),
    getFunctionSignatures: async (pkgPath: string) => state.signatures[pkgPath] ?? [],
    sendTransaction: async (encoded: string) => {
      state.broadcasts.push(encoded);
      return { hash: 'HASH', height: '42', deliver_tx: { ResponseBase: { Data: null } }, check_tx: {} };
    },
  };

  return { state, provider: provider as unknown as GnoProvider, factory: async () => provider as unknown as GnoProvider };
};
