import { toBase64 } from '@cosmjs/encoding';
import { SessionAccountInfo } from '@gnolang/gno-js-client';
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
  // Indexed txs by hash; any other hash gets the node's not-found error.
  transactions: Record<string, 'committed' | 'failed'>;
  // Session accounts by master address, as auth/accounts/<master>/sessions reports them.
  sessions: Record<string, SessionAccountInfo[]>;
  // Deployed package paths served by vm/qpaths (string-prefix matched, like the node).
  realmPaths: string[];
  // Makes the next broadcast fail like a node rejection.
  rejectBroadcast?: Error;
}

// The JSON-RPC error text tm2 returns for an unknown tx hash, as the RPC client relays it.
export const txNotFoundError = (hash: string): Error =>
  new Error(JSON.stringify({ code: -32603, message: 'Internal error', data: `Could not find tx result for hash #${hash}` }));

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
    transactions: {},
    sessions: {},
    realmPaths: [],
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

      // Like the node: JSON null for no sessions, empty data for an unknown one.
      const sessions = /^auth\/accounts\/([^/]+)\/sessions$/.exec(path);

      if (sessions) {
        const list = state.sessions[sessions[1]] ?? [];

        return { response: { ResponseBase: { Data: encodeData(list.length > 0 ? list : null) } } };
      }

      const single = /^auth\/accounts\/([^/]+)\/session\/([^/]+)$/.exec(path);

      if (single) {
        const session = (state.sessions[single[1]] ?? []).find(item => item.address === single[2]);

        return { response: { ResponseBase: { Data: session ? encodeData(session) : null } } };
      }

      const address = path.replace('bank/balances/', '');

      return { response: { ResponseBase: { Data: encodeData(state.balances[address] ?? '') } } };
    },
    getAccount: async () => ({
      BaseAccount: { account_number: state.accountNumber, sequence: state.sequence },
    }),
    evaluateExpression: async (pkgPath: string, expression: string) => state.evaluate(pkgPath, expression),
    getFunctionSignatures: async (pkgPath: string) => state.signatures[pkgPath] ?? [],
    getTransaction: async (hash: string) => {
      const status = state.transactions[hash];

      if (!status) {
        throw txNotFoundError(hash);
      }

      return { hash, height: '41', tx_result: { ResponseBase: { Error: status === 'failed' ? { '@type': '/std.InternalError' } : null } } };
    },
    getRealmPaths: async (prefix: string) => state.realmPaths.filter(path => path.startsWith(prefix)),
    sendTransaction: async (encoded: string) => {
      if (state.rejectBroadcast) {
        const error = state.rejectBroadcast;

        state.rejectBroadcast = undefined;
        throw error;
      }

      state.broadcasts.push(encoded);
      return { hash: 'HASH', height: '42', deliver_tx: { ResponseBase: { Data: null } }, check_tx: {} };
    },
  };

  return { state, provider: provider as unknown as GnoProvider, factory: async () => provider as unknown as GnoProvider };
};
