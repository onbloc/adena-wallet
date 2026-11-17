import {
  DEFAULT_GAS_PRICE_RATE,
  MINIMUM_GAS_PRICE,
} from '@common/constants/gas.constant';
import {GNOT_TOKEN} from '@common/constants/token.constant';
import {DEFAULT_GAS_WANTED} from '@common/constants/tx.constant';
import type {GnoProvider} from '@common/provider/gno/gno-provider';
import {Account, Document, documentToDefaultTx} from 'adena-module';
import BigNumber from 'bignumber.js';

export interface FeeEstimate {
  gasUsed: number;
  gasWanted: number;
  /** In ugnot. */
  gasFee: number;
  gasPrice: number;
}

export function withFee(
  document: Document,
  gasWanted: number,
  gasFee: number,
): Document {
  return {
    ...document,
    fee: {
      amount: [{denom: GNOT_TOKEN.denom, amount: gasFee.toString()}],
      gas: gasWanted.toString(),
    },
  };
}

/**
 * Simulates the transaction and prices it like the extension's "Average"
 * network-fee tier: gasWanted = gasUsed × 1.1, fee = gasWanted × gas price.
 * Throws when the simulation fails, which means the transaction would fail
 * on chain; callers must not offer to sign it.
 */
export async function estimateFee(
  provider: GnoProvider,
  account: Account,
  document: Document,
): Promise<FeeEstimate> {
  const chainGasPrice = await provider.getGasPriceRatio().catch(() => 0);
  const gasPrice = chainGasPrice > 0 ? chainGasPrice : MINIMUM_GAS_PRICE;

  const probeFee = Number(
    BigNumber(1000).multipliedBy(gasPrice).toFixed(0, BigNumber.ROUND_UP),
  );
  const probe = withFee(document, DEFAULT_GAS_WANTED, probeFee);
  const result = await provider.simulateTx(
    documentToDefaultTx(probe, account.publicKey),
  );

  const gasUsed = Number(result.gas_used);
  if (!Number.isFinite(gasUsed) || gasUsed <= 0) {
    throw new Error('The simulation returned no gas usage');
  }
  const gasWanted = Number(
    BigNumber(gasUsed)
      .multipliedBy(DEFAULT_GAS_PRICE_RATE.AVERAGE)
      .toFixed(0, BigNumber.ROUND_DOWN),
  );
  const gasFee = Number(
    BigNumber(gasWanted).multipliedBy(gasPrice).toFixed(0, BigNumber.ROUND_UP),
  );
  return {gasUsed, gasWanted, gasFee, gasPrice};
}
