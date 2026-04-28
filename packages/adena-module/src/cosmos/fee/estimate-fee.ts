import { StdFee } from '@cosmjs/amino';
import { SignMode } from 'cosmjs-types/cosmos/tx/signing/v1beta1/signing';

import { makeTxRaw } from '../proto/make-tx-raw';
import { CosmosProvider } from '../providers/cosmos-provider';
import { resolveAccount } from '../signer-helpers';
import { CosmosDocument } from '../types';

export interface EstimateCosmosFeeParams {
  document: CosmosDocument;
  // Public key of the signer. Used only to populate the simulate tx's
  // AuthInfo — no signing happens in this function (we send a zero
  // signature). Passing the key directly (rather than a Keyring) keeps fee
  // estimation usable when the persisted wallet keyring is unreachable
  // (e.g. Ledger accounts whose keyringId drifted from the stored keyring).
  publicKey: Uint8Array;
  cosmosProvider: CosmosProvider;
  hdPath?: number;
  // Fee stub used inside the simulate tx's AuthInfo. The node ignores its
  // amount for gas estimation, but the structure must still be valid — so
  // we pass the chain's proven-working fallbackFee.
  simulateFee: StdFee;
  // Fee denom the wallet will actually pay with. Used to pick the matching
  // entry out of the feemarket gas_prices response.
  feeDenom: string;
}

export interface CosmosFeeEstimate {
  /** Gas used reported by `/cosmos/tx/v1beta1/simulate`. */
  gasUsed: number;
  /** Dec string from `/feemarket/v1/gas_prices` for `feeDenom`. */
  minBaseGasPrice: string;
  feeDenom: string;
}

const SIMULATE_ZERO_SIGNATURE = new Uint8Array(64);

/**
 * Orchestrate the two network calls needed to price a Cosmos tx:
 *
 *   1. Build a zero-signature TxRaw from the document (real pubkey + sequence
 *      are required for the node's AuthInfo checks; the 64-byte zero signature
 *      is the simulate convention).
 *   2. `simulateTx` → gasUsed.
 *   3. `getFeemarketGasPrices` → minBaseGasPrice for the chosen denom.
 *
 * The caller (e.g. `TransactionService`) combines the returned estimate with
 * preset multipliers via `calcFee` to build the slow/average/fast tiers.
 */
export async function estimateCosmosFee(
  params: EstimateCosmosFeeParams,
): Promise<CosmosFeeEstimate> {
  const { document, publicKey, cosmosProvider, simulateFee, feeDenom } =
    params;

  const { sequence } = await resolveAccount(document, cosmosProvider);

  const simulateTxBytes = makeTxRaw({
    msgs: document.msgs,
    memo: document.memo,
    fee: simulateFee,
    sequence,
    publicKey,
    signature: SIMULATE_ZERO_SIGNATURE,
    signMode: SignMode.SIGN_MODE_DIRECT,
  });

  const [{ gasUsed }, prices] = await Promise.all([
    cosmosProvider.simulateTx(simulateTxBytes),
    cosmosProvider.getMinGasPrices(),
  ]);

  const match = prices.find((p) => p.denom === feeDenom);
  if (!match) {
    throw new Error(
      `min_gas_price has no entry for denom="${feeDenom}"`,
    );
  }

  return {
    gasUsed,
    minBaseGasPrice: match.amount,
    feeDenom,
  };
}
